
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Message, Role, GroundingSource, MODELS } from "../types";
import { saveImageToDB, getImageFromDB } from "./imageDb";

// Helper to init AI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChatStream = async (
  history: Message[],
  currentPrompt: string,
  imageContext: string | null, // Can be Base64 OR an ID (img_...)
  selectedModel: string, // Dynamic model selection
  config: { imageMode: boolean; webSearch: boolean },
  onChunk: (text: string, grounding?: GroundingSource[], generatedImageId?: string) => void
) => {
  const ai = getAI();
  
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

  if (config.imageMode) {
    // IMAGE GENERATION / EDITING MODE
    try {
      const parts: any[] = [];
      
      if (realImageBase64) {
        // Extract correct MIME type from the data URI
        let mimeType = 'image/png';
        const mimeMatch = realImageBase64.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }

        const base64Data = realImageBase64.replace(/^data:image\/\w+;base64,/, "");
        
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
        });
        // Explicitly instruct the model to GENERATE/EDIT the image
        parts.push({ text: `${currentPrompt}\n\n(Generate the resulting image)` });
      } else {
        parts.push({ text: currentPrompt });
      }

      const response = await ai.models.generateContent({
        model: MODELS.GEMINI_IMAGE, // Always use image model in image mode
        contents: { parts },
        config: {
            // Relax safety filters to minimize refusals
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ]
        }
      });

      let textOutput = "";
      let imageOutput = "";

      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageOutput = part.inlineData.data;
            } else if (part.text) {
                textOutput += part.text;
            }
        }
      }
      
      if (imageOutput) {
          // SAVE TO DB IMMEDIATELY, get ID
          const fullBase64 = `data:image/png;base64,${imageOutput}`;
          const imageId = await saveImageToDB(fullBase64);
          
          // Return ID to the UI
          onChunk(textOutput, undefined, imageId);
      } else {
          const failureMessage = textOutput 
            ? `${textOutput}\n\n*[System: No image was generated. The model may have interpreted this as a chat request or refused the prompt safety checks.]*`
            : "Failed to generate image. The model might have refused the prompt due to safety filters.";
            
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

    // Format History: Ensure strictly User/Model alternation and no empty parts
    // If a previous model response was only an image (empty text), we must inject a placeholder.
    // We removed the .filter() to avoid breaking the alternation.
    const previousHistory = history.slice(0, -1)
        .map(msg => {
            const role = msg.role === Role.USER ? 'user' : 'model';
            // If text is missing or empty, provide a fallback placeholder to keep API happy
            let text = msg.text;
            if (!text || text.trim() === "") {
                text = msg.generatedImage ? "[Image Generated]" : "[Content]";
            }
            return {
                role,
                parts: [{ text }]
            };
        });

    const chat = ai.chats.create({
      model: selectedModel, 
      history: previousHistory,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      },
    });
    
    const result = await chat.sendMessageStream({ message: currentPrompt });

    let fullText = "";
    let extractedGrounding: GroundingSource[] = [];

    for await (const chunk of result) {
      if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
              if (part.text) {
                  fullText += part.text;
              }
          }
      } else {
          // Fallback for some models
          const textChunk = chunk.text || "";
          fullText += textChunk;
      }

      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = chunk.candidates[0].groundingMetadata.groundingChunks;
        chunks.forEach((c: any) => {
            if (c.web) {
                extractedGrounding.push({ title: c.web.title, uri: c.web.uri });
            }
        });
      }

      onChunk(
          fullText.trimStart(), 
          extractedGrounding.length > 0 ? extractedGrounding : undefined, 
          undefined
      );
    }

  } catch (error: any) {
    console.error("Chat Stream Error:", error);
    onChunk(`Error: ${error.message}\n\n*Tip: If using Gemini 3 Pro, try switching to Gemini 2.5 Flash if you experience issues.*`, undefined, undefined);
  }
};
