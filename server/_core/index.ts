import "dotenv/config";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ensureDevUser } from "./seedDevUser.js";
import { ensureDefaultWorkersForExistingUsers } from "./seedDefaultWorkers";
import { startPushReminderScheduler } from "./pushScheduler";
import { isPushConfigured } from "./pushService";
import { serveStatic } from "./serveStatic";

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

async function startServer() {
  await ensureDevUser();
  await ensureDefaultWorkersForExistingUsers();

  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // 版本檢查 API（供客戶端比對是否有更新，dev 時回傳 0）
  app.get("/api/version", (_req, res) => {
    if (process.env.NODE_ENV !== "production") {
      return res.json({ version: "0" });
    }
    try {
      const versionPath = path.join(import.meta.dirname, "public", "version.json");
      if (fs.existsSync(versionPath)) {
        const data = fs.readFileSync(versionPath, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({ version: "0" });
      }
    } catch {
      res.json({ version: "0" });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  // use Vite for non-production (default) and static files for production
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(app, server, port);
  }

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (isPushConfigured()) {
      startPushReminderScheduler();
    } else {
      console.log("[Push] VAPID keys not set, push reminders disabled");
    }
  });
}

startServer().catch(console.error);
