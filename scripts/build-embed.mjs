import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "esbuild.embed.config.js");

const config = await import(pathToFileURL(configPath).href).then(m => m.default || m);

const isWatch = process.argv.includes("--watch");

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("👀 Watching embed.ts for changes...");
} else {
  await esbuild.build(config);
  console.log(" \x1b[32m✓\x1b[0m embed.js build successful");
}