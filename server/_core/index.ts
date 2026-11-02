import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { assertLocalAuthConfiguration } from "./local-auth";
import * as db from "../db";
import { registerSeoRoutes } from "../cms/seo";

async function startServer() {
  if (ENV.authProvider === "local") await assertLocalAuthConfiguration();
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", async (_req, res) => {
    try {
      if (!(await db.checkDatabase())) {
        res.status(503).json({ status: "starting", database: "unavailable" });
        return;
      }
      res.json({ status: "ok", database: "ready" });
    } catch {
      res.status(503).json({ status: "starting", database: "unavailable" });
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });

  if (ENV.authProvider === "manus") registerOAuthRoutes(app);
  if (ENV.storageProvider === "local") {
    app.use("/uploads", express.static(ENV.uploadDir, {
      dotfiles: "deny",
      fallthrough: false,
      index: false,
      maxAge: "1y",
      immutable: true,
    }));
  }

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server, async (vite) => {
      registerSeoRoutes(app, (url, html) => vite.transformIndexHtml(url, html));
    });
  } else {
    registerSeoRoutes(app);
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", (error) => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch((error) => { console.error(error); process.exit(1); });
