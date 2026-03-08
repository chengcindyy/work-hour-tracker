import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Serve static files from the built client (dist/public).
 * Used in production mode only.
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first (pnpm build)`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html for SPA routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
