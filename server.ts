import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health and System Diagnostics API
app.get("/api/health", (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    appState: "running",
    hasApiKey,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    server: "Node.js Express + Vite",
    environment: process.env.NODE_ENV || "development",
  });
});

// Gemini Chat & Smart Generation API
app.post("/api/chat", async (req, res) => {
  try {
    const { message, systemInstruction, history = [] } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "الرجاء إدخال نص الرسالة (Message is required)" });
    }

    const ai = getGeminiClient();

    // Prepare contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item && item.text) {
          contents.push({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: String(item.text) }],
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction:
          systemInstruction ||
          "You are an intelligent, friendly AI assistant fluent in Arabic and English. Format responses with clear markdown, bullet points, and helpful explanations. Always respond with high quality, respectful tone, and clear insights.",
      },
    });

    return res.json({
      text: response.text || "تمت المعالجة بنجاح ولكن لم يتم إرجاع أي نص.",
      model: "gemini-3.7-flash",
    });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    return res.status(500).json({
      error: err.message || "حدث خطأ غير متوقع أثناء معالجة الطلب.",
    });
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
