#!/usr/bin/env node
/**
 * Brand pack tooling.
 *
 *   pnpm brand:validate <pack folder>   check brand.json and its files, as the Hub does at start
 *   pnpm brand:schema                   write lib/branding/brand.schema.json from the zod schema
 *
 * The checks live in lib/branding (schema.ts, read-pack.ts, palette.ts); this script
 * bundles them with esbuild, so the script and the Hub cannot disagree.
 */
import * as esbuild from "esbuild";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hubRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaFile = path.join(hubRoot, "lib/branding/brand.schema.json");

const ENTRY = `
export { readBrandPack, BrandPackError } from "./lib/branding/read-pack.ts";
export { brandPackJsonSchema } from "./lib/branding/schema.ts";
export { checkBrandContrast } from "./lib/branding/palette.ts";
export { parseCssColor } from "./lib/branding/color.ts";
`;

async function loadBranding() {
  const result = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: hubRoot, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
}

function schemaText(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

async function validate(dir) {
  if (!dir) {
    console.error("Usage: pnpm brand:validate <pack folder>");
    return 2;
  }
  const branding = await loadBranding();
  let loaded;
  try {
    loaded = branding.readBrandPack(path.resolve(dir));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "BrandPackError")
      throw error;
    console.error(error.message);
    return 1;
  }

  const color = loaded.pack.tokens?.color;
  const findings = color
    ? branding.checkBrandContrast({
        primary: branding.parseCssColor(color.primary.$value),
        onDark: color["primary-on-dark"]
          ? branding.parseCssColor(color["primary-on-dark"].$value)
          : null,
      })
    : [];
  for (const finding of findings) {
    console.warn(
      `warning: ${finding.token}: ${finding.ratio}:1 against the ${finding.mode} page background; ` +
        `WCAG 2.x asks ${finding.minimum}:1 for controls and focus rings`,
    );
  }
  console.log(
    `Brand pack OK: ${loaded.pack.name} (${loaded.dir}, ${loaded.files.size} files)`,
  );
  return 0;
}

async function writeSchema() {
  const branding = await loadBranding();
  writeFileSync(schemaFile, schemaText(branding.brandPackJsonSchema()));
  console.log(`Wrote ${path.relative(process.cwd(), schemaFile)}`);
  return 0;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case "validate":
      process.exitCode = await validate(arg);
      break;
    case "schema":
      process.exitCode = await writeSchema();
      break;
    default:
      console.error(
        "Usage: node scripts/brand-pack.mjs validate <pack folder> | schema",
      );
      process.exitCode = 2;
  }
}
