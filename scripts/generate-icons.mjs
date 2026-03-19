#!/usr/bin/env node
/**
 * Generate favicon and PWA icons from source icon.png
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../client/public");
const srcPath = join(publicDir, "icon.png");

async function main() {
  const sizes = [
    { name: "favicon-32.png", size: 32 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-16x16.png", size: 16 },
    { name: "favicon-48x48.png", size: 48 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "android-chrome-192x192.png", size: 192 },
    { name: "android-chrome-512x512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  for (const { name, size } of sizes) {
    await sharp(srcPath).resize(size, size).toFile(join(publicDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
