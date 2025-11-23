
import { Message, Role, GroundingSource, MODELS } from "../types";
import { saveImageToDB, getImageFromDB } from "./imageDb";

// Determine API Endpoint
// In dev: uses Vite proxy (relative path)
// In prod: uses VITE_API_BASE_URL if set, otherwise assumes same origin
const meta = import.meta as any;
const API_BASE_URL = meta.env?.VITE_API_BASE_URL 
  ? meta.env.VITE_API_BASE_URL.replace(/\/$/, '') // Remove trailing slash
  : '/api'; 

// Helper to handle full URL construction
const getApiUrl = (endpoint: string) => {
  if (API_BASE_URL.startsWith('http')) {
    // If absolute URL, append endpoint (removing /api from endpoint if base already has it to avoid duplicate)
    // But our convention is base='http://.../api' or base='http://...'
    // Let's keep it simple: Base + Endpoint.
    // If base is "http://localhost:3001", result is "http://localhost:3001/chat" (requires backend to mount at root or adjust)
    
    // To support the server.js structure which is mounted at /api/chat:
    // If VITE_API_BASE_URL is "http://myserver.com/api", result is "http://myserver.com/api/chat"
    return `${API_BASE_URL}${endpoint.replace(/^\/api/, '')}`;
  }
  // Relative path (proxy)
  return endpoint;
};

export const generateChatStream = async (
  history: Message[],
  currentPrompt: string,
  imageContexts: string[], // List of Base64 strings OR IDs (img_...)
  selectedModel: string, // Dynamic model selection
  config: { imageMode: boolean; webSearch: boolean },
  onChunk: (text: string, grounding?: GroundingSource[], generatedImageId?: string) => void
) => {
  
  // Resolve imageContexts: If they are IDs, fetch the real base64 data
  const realImages = await Promise.all(imageContexts.map(async (ctx) => {
      if (ctx && ctx.startsWith('img_')) {
          try {
              const fetched = await getImageFromDB(ctx);
              if (fetched) return fetched;
          } catch (e) {
              console.error("Error fetching image from DB:", e);
          }
      }
      return ctx;
  }));

  // Prepare history for API (remove internal IDs, etc.)
  const apiHistory = history.map(msg => {
      const role = msg.role === Role.USER ? 'user' : 'model';
      // If text is missing or empty, provide a fallback placeholder
      let text = msg.text;
      if (!text || text.trim() === "") {
          text = msg.generatedImage ? "[图片已生成]" : "[内容]";
      }
      return {
          role,
          parts: [{ text }]
      };
  });

  try {
    const url = getApiUrl('/api/chat');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: apiHistory,
        message: currentPrompt,
        images: realImages, // Pass array of images
        model: selectedModel,
        config
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `服务器错误: ${response.statusText}`);
    }

    if (config.imageMode) {
      // Handle single JSON response for Image Mode
      const data = await response.json();
      
      if (data.image) {
         const imageId = await saveImageToDB(data.image);
         onChunk(data.text || "", undefined, imageId);
      } else {
         const failureMessage = data.text 
            ? `${data.text}\n\n*[系统: 未能生成图片]*`
            : "生成图片失败。";
         onChunk(failureMessage, undefined, undefined);
      }
    } else {
      // Handle Streamed Response for Chat Mode
      const reader = response.body?.getReader();
      if (!reader) throw new Error("无响应内容");
      
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
    onChunk(`错误: ${error.message}\n\n*请检查后台控制台以获取详细信息。*`, undefined, undefined);
  }
};
