import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import os from "os";
import OpenAI from "openai";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function getLocalNetworkUrls(host: string, port: number) {
  if (!["0.0.0.0", "::"].includes(host)) {
    return [`http://${host}:${port}/`];
  }

  const interfaces = os.networkInterfaces();
  const urls = new Set<string>();

  for (const addresses of Object.values(interfaces)) {
    if (!addresses) continue;

    for (const address of addresses) {
      if (address.internal || address.family !== "IPv4") continue;
      urls.add(`http://${address.address}:${port}/`);
    }
  }

  return Array.from(urls);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const openai = ENV.openAiApiKey
    ? new OpenAI({ apiKey: ENV.openAiApiKey })
    : null;

  const allowedVoices = new Set([
    "alloy",
    "echo",
    "fable",
    "onyx",
    "nova",
    "shimmer",
  ] as const);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.post("/api/tts", async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const voiceInput =
      typeof req.body?.voice === "string" ? req.body.voice.trim().toLowerCase() : "nova";
    const speedInput =
      typeof req.body?.speed === "number" ? req.body.speed : Number(req.body?.speed ?? 1);
    const voice = allowedVoices.has(voiceInput as any)
      ? (voiceInput as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer")
      : "nova";
    const speed = Number.isFinite(speedInput) ? Math.min(4, Math.max(0.25, speedInput)) : 1;

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "text too long (max 500 chars)" });
    }
    if (!openai) {
      return res.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    }

    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: text,
        speed,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=86400",
      });
      return res.send(buffer);
    } catch (error) {
      console.error("TTS error:", error);
      return res.status(500).json({ error: "TTS generation failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const host = process.env.HOST || "0.0.0.0";
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}/`);

    for (const url of Array.from(getLocalNetworkUrls(host, port))) {
      if (url !== `http://localhost:${port}/`) {
        console.log(`Network access: ${url}`);
      }
    }
  });
}

startServer().catch(console.error);
