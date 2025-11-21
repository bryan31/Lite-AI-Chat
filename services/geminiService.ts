
import { Message, Role, GroundingSource, MODELS } from "../types";
import { saveImageToDB, getImageFromDB } from "./imageDb";

export const generateChatStream = async (
  history: Message[],
  currentPrompt: string,
  imageContext: string | null, // Can be Base64 OR an ID (img_...)
  selectedModel: string, // Dynamic model selection
  config: { imageMode: boolean; webSearch: boolean },
  onChunk: (text: string, grounding?: GroundingSource[], generatedImageId?: string) => void
) => {
  
  // Resolve imageContext: If it is an ID, fetch the real base64 data
  let realImageBase64 = imageContext;
  if (imageContext && imageContext.startsWith('img_')) {
      try {
          const fetched = await getImageFromDB(imageContext);
          if (fetched) realImageBase64 = fetched;
      } catch (e) {
          console.error("Error fetching image from DB:", e);
      }
  }

  // Prepare history for API (remove internal IDs, etc.)
  const apiHistory = history.map(msg => {
      const role = msg.role === Role.USER ? 'user' : 'model';
      // If text is missing or empty, provide a fallback placeholder
      let text = msg.text;
      if (!text || text.trim() === "") {
          text = msg.generatedImage ? "[Image Generated]" : "[Content]";
      }
      return {
          role,
          parts: [{ text }]
      };
  });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: apiHistory,
        message: currentPrompt,
        imageContext: realImageBase64,
        model: selectedModel,
        config
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.statusText}`);
    }

    if (config.imageMode) {
      // Handle single JSON response for Image Mode
      const data = await response.json();
      
      if (data.image) {
         const imageId = await saveImageToDB(data.image);
         onChunk(data.text || "", undefined, imageId);
      } else {
         const failureMessage = data.text 
            ? `${data.text}\n\n*[System: No image was generated.]*`
            : "Failed to generate image.";
         onChunk(failureMessage, undefined, undefined);
      }
    } else {
      // Handle Streamed Response for Chat Mode
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      
      const decoder = new TextDecoder();
      let fullText = "";
      let allGrounding: GroundingSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        // Split by newline to handle NDJSON
        const lines = chunkStr.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
           try {
              const data = JSON.parse(line);
              
              if (data.text) {
                 fullText += data.text;
              }

              if (data.grounding) {
                 allGrounding = [...allGrounding, ...data.grounding];
              }

              // Propagate update
              onChunk(fullText, allGrounding.length > 0 ? allGrounding : undefined, undefined);
           } catch (e) {
              console.error("Error parsing stream chunk", e);
           }
        }
      }
    }

  } catch (error: any) {
    console.error("Chat Service Error:", error);
    onChunk(`Error: ${error.message}\n\n*Check backend console for details.*`, undefined, undefined);
  }
};
