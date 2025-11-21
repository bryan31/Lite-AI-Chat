
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Message, Role, GroundingSource } from "../types";
import { saveImageToDB, getImageFromDB } from "./imageDb";

// Define models based on guidelines
const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// Helper to init AI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChatStream = async (
  history: Message[],
  currentPrompt: string,
  imageContext: string | null, // Can be Base64 OR an ID (img_...)
  config: { imageMode: boolean; webSearch: boolean },
  onChunk: (text: string, grounding?: GroundingSource[], generatedImageId?: string) => void
) => {
  const ai = getAI();
  
  // Resolve imageContext: If it is an ID, fetch the real base64 data
  let realImageBase64 = imageContext;
  if (imageContext && imageContext.startsWith('img_')) {
      realImageBase64 = await getImageFromDB(imageContext);
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
        model: IMAGE_MODEL,
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

    // Prepare history. Since we only store IDs in the UI history, we need to ensure 
    // text mode doesn't choke. Gemini 3 Pro text chat doesn't support image history 
    // in the same way as 'imageMode', so we usually strip images for text chat history 
    // OR we would need to resolve them. For simplicity in this app, we strip previous images for text chat context
    // to save tokens, unless we want multimodal chat.
    const previousHistory = history.slice(0, -1).map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }] // We only send text history for standard chat to keep it fast
    }));

    const chat = ai.chats.create({
      model: TEXT_MODEL,
      history: previousHistory,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      }
    });
    
    const result = await chat.sendMessageStream({ message: currentPrompt });

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
