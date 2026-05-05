import "dotenv/config";
import cors from "cors";
import express from "express";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "../db";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";
import { serveStatic, setupVite } from "./vite";

function isAllowedCorsOrigin(
  origin: string,
  allowedOrigins: string[],
  requestOrigin?: string
) {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV === "production") {
    try {
      const { host, protocol } = new URL(origin);
      return requestOrigin === `${protocol}//${host}`;
    } catch {
      return false;
    }
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function validateEnv(): void {
  const errors: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required but not set");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push("JWT_SECRET is required but not set");
  } else if (jwtSecret.length < 32) {
    errors.push(
      `JWT_SECRET too short (${jwtSecret.length} chars, minimum 32 required)`
    );
  }

  if (errors.length > 0) {
    console.error("Startup validation failed:");
    errors.forEach(error => console.error("  -", error));
    process.exit(1);
  }

  console.log("Environment validation passed");
}

async function checkDbConnection(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    console.log("Database connection OK");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

async function startServer() {
  validateEnv();
  await checkDbConnection();

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

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const ttsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "TTS rate limit exceeded" },
  });
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173"];

  app.use(
    cors((req, callback) => ({
      origin: (
        origin: string | undefined,
        originCallback: (err: Error | null, allow?: boolean) => void
      ) => {
        const requestHost =
          req.headers["x-forwarded-host"]?.toString() ?? req.headers.host;
        const requestProtocol =
          req.headers["x-forwarded-proto"]?.toString() ??
          process.env.FORWARDED_PROTO ??
          "https";

        if (
          !origin ||
          isAllowedCorsOrigin(
            origin,
            allowedOrigins,
            requestHost ? `${requestProtocol}://${requestHost}` : undefined
          )
        ) {
          originCallback(null, true);
        } else {
          originCallback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
    }))
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));
  app.use("/api/tts", ttsLimiter);
  app.use("/api/trpc/auth.signIn", authLimiter);
  app.use("/api/trpc/auth.signUp", authLimiter);

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

  const PORT = parseInt(process.env.PORT || "8080", 10);
  const HOST = process.env.HOST || "0.0.0.0";

  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received - shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Graceful shutdown timeout - forcing exit.");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(console.error);
