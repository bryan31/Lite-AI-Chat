import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Attempt to load .env first
dotenv.config();

// If .env didn't provide the key, try loading .env.local explicitly
// (Node.js dotenv doesn't load .env.local by default, unlike Vite)
if (!process.env.API_KEY) {
  if (fs.existsSync('.env.local')) {
    console.log('Loading environment variables from .env.local');
    dotenv.config({ path: '.env.local' });
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Support specific CORS origin for production split deployment
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // In production, set CORS_ORIGIN to your frontend domain
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Allow large payloads for images

// Initialize Gemini API
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("⚠️ WARNING: API_KEY is missing. Requests will fail.");
}

// Create client only if key exists to avoid immediate crash, handle error in route
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Server API Key not configured." });
  }

  const { history, message, imageContext, model, config } = req.body;

  try {
    if (config.imageMode) {
      // --- Image Generation / Editing Mode ---
      const parts = [];

      if (imageContext) {
        // Extract MIME type and data
        let mimeType = 'image/png';
        const mimeMatch = imageContext.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) mimeType = mimeMatch[1];
        const base64Data = imageContext.replace(/^data:image\/\w+;base64,/, "");

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          }
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

      // Send JSON response
      res.json({
        text: textOutput,
        image: imageOutput ? `data:image/png;base64,${imageOutput}` : null
      });

    } else {
      // --- Text / Chat Mode ---
      const systemInstruction = "You are a helpful AI assistant.";
      const tools = [];
      if (config.webSearch) {
        tools.push({ googleSearch: {} });
      }

      const chat = ai.chats.create({
        model: model,
        history: history,
        config: {
          systemInstruction,
          tools: tools.length > 0 ? tools : undefined,
        },
      });

      const result = await chat.sendMessageStream({ message: message });

      // Set headers for streaming
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');

      for await (const chunk of result) {
        const chunkData = {};
        
        const text = chunk.text;
        if (text) chunkData.text = text;

        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
           // Normalize grounding chunks to simple object
           const rawChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
           chunkData.grounding = rawChunks
             .filter(c => c.web)
             .map(c => ({ title: c.web.title, uri: c.web.uri }));
        }

        // Send as newline-delimited JSON
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});