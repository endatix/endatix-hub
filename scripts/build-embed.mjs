import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "esbuild.embed.config.js");
const config = await import(configPath).then(m => m.default || m);

const isWatch = process.argv.includes("--watch");

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("👀 Watching embed.ts for changes...");
} else {
  await esbuild.build(config);
  console.log(" \x1b[32m✓\x1b[0m embed.js build successful");
}
