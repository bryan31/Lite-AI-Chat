import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Attempt to load .env first
dotenv.config();

// If .env didn't provide the key, try loading .env.local explicitly
if (!process.env.API_KEY && !process.env.GEMINI_API_KEY) {
  if (fs.existsSync('.env.local')) {
    console.log('Loading environment variables from .env.local');
    dotenv.config({ path: '.env.local' });
  }
}

// Normalize variable: Support GEMINI_API_KEY as an alias for API_KEY
if (!process.env.API_KEY && process.env.GEMINI_API_KEY) {
  process.env.API_KEY = process.env.GEMINI_API_KEY;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini API
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.warn("⚠️ WARNING: API_KEY is missing. Requests will fail.");
}
const ai = apiKey ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// --- API Routes ---
app.post('/api/chat', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Server API Key not configured." });
  }

  const { history, message, imageContext, model, config } = req.body;

  try {
    if (config.imageMode) {
      // Image Generation Logic
      const parts = [];
      if (imageContext) {
        let mimeType = 'image/png';
        const mimeMatch = imageContext.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) mimeType = mimeMatch[1];
        const base64Data = imageContext.replace(/^data:image\/\w+;base64,/, "");

        parts.push({
          inlineData: { data: base64Data, mimeType: mimeType }
        });
        parts.push({ text: `${message}\n\n(Generate the resulting image)` });
      } else {
        parts.push({ text: message });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
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

      res.json({
        text: textOutput,
        image: imageOutput ? `data:image/png;base64,${imageOutput}` : null
      });

    } else {
      // Chat Logic
      const systemInstruction = "You are a helpful AI assistant.";
      const tools = [];
      if (config.webSearch) tools.push({ googleSearch: {} });

      const chat = ai.chats.create({
        model: model,
        history: history,
        config: { systemInstruction, tools: tools.length > 0 ? tools : undefined },
      });

      const result = await chat.sendMessageStream({ message: message });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');

      for await (const chunk of result) {
        const chunkData = {};
        if (chunk.text) chunkData.text = chunk.text;
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
           const rawChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
           chunkData.grounding = rawChunks.filter(c => c.web).map(c => ({ title: c.web.title, uri: c.web.uri }));
        }
        if (Object.keys(chunkData).length > 0) {
          res.write(JSON.stringify(chunkData) + '\n');
        }
      }
      res.end();
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

console.log('ℹ️  Server is running in API-only mode.');
console.log('ℹ️  Frontend must be run separately (e.g., on port 3000).');

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});