import { GoogleGenAI, Type } from "@google/genai";
import { Message, Role, GroundingSource } from "../types";

// Define models based on guidelines
const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// Helper to init AI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChatStream = async (
  history: Message[],
  currentPrompt: string,
  imageContext: string | null, // Base64 image for editing/multimodal
  config: { imageMode: boolean; webSearch: boolean },
  onChunk: (text: string, grounding?: GroundingSource[], generatedImage?: string) => void
) => {
  const ai = getAI();
  
  if (config.imageMode) {
    // IMAGE GENERATION / EDITING MODE
    try {
      const parts: any[] = [];
      
      if (imageContext) {
        // Extract correct MIME type from the data URI
        let mimeType = 'image/png';
        const mimeMatch = imageContext.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }

        const base64Data = imageContext.replace(/^data:image\/\w+;base64,/, "");
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        });
        // Explicitly instruct the model to GENERATE/EDIT the image, otherwise it might just chat about it.
        parts.push({ text: `${currentPrompt}\n\n(Generate the resulting image)` });
      } else {
        parts.push({ text: currentPrompt });
      }

      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts },
        config: {}
      });

      let textOutput = "";
      let imageOutput = "";

      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                // Return the raw base64 string. The UI will convert to Blob for performance.
                imageOutput = part.inlineData.data;
            } else if (part.text) {
                textOutput += part.text;
            }
        }
      }
      
      if (imageOutput) {
          // Pass image separately, do not append to text
          onChunk(textOutput, undefined, `data:image/png;base64,${imageOutput}`);
      } else {
          // If text exists but no image, the model likely refused generation or treated it as chat.
          const failureMessage = textOutput 
            ? `${textOutput}\n\n*[System: No image was generated. The model may have interpreted this as a chat request or refused the prompt safety checks.]*`
            : "Failed to generate image. The model might have refused the prompt.";
            
          onChunk(failureMessage, undefined, undefined);
      }

    } catch (error: any) {
      console.error("Image Gen Error:", error);
      onChunk(`Error generating image: ${error.message}. Try a different prompt or image format.`, undefined, undefined);
    }
    return;
  }

  // TEXT / CHAT MODE
  try {
    const systemInstruction = "You are a helpful AI assistant.";

    const tools: any[] = [];
    if (config.webSearch) {
        tools.push({ googleSearch: {} });
    }

    const previousHistory = history.slice(0, -1).map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: TEXT_MODEL,
      history: previousHistory,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      }
    });
    
    let messageContent: any = currentPrompt;
    
    // Handle multimodal input for standard chat (checking image, etc)
    // Note: We currently only pass imageContext in 'imageMode', but if we wanted 
    // to support "Chat about this image" with Gemini Pro, we would handle it here.
    // For now, imageContext is primarily used for the Image Generation/Editing path.

    const result = await chat.sendMessageStream({ message: messageContent });

    let fullText = "";
    let extractedGrounding: GroundingSource[] = [];

    for await (const chunk of result) {
      const textChunk = chunk.text || "";
      fullText += textChunk;

      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = chunk.candidates[0].groundingMetadata.groundingChunks;
        chunks.forEach((c: any) => {
            if (c.web) {
                extractedGrounding.push({ title: c.web.title, uri: c.web.uri });
            }
        });
      }

      onChunk(fullText.trimStart(), extractedGrounding.length > 0 ? extractedGrounding : undefined, undefined);
    }

  } catch (error: any) {
    console.error("Chat Stream Error:", error);
    onChunk(`Error: ${error.message}`, undefined, undefined);
  }
};