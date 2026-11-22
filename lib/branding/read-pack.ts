/**
 * Reads and checks a brand pack folder. Shared by the Hub's loader and
 * `pnpm brand:validate`, so both report the same field paths. No `@/` imports:
 * `scripts/brand-pack.mjs` bundles this file.
 */
import { createHash, type Hash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import {
  formatBrandPackIssues,
  parseBrandPack,
  type BrandPack,
} from "./schema";

export const BRAND_FILE = "brand.json";

const SERVED_TYPES = ".svg, .png, .jpg, .jpeg, .webp or .ico";

export class BrandPackError extends Error {
  constructor(dir: string, detail: string) {
    super(`Invalid brand pack in ${dir}:\n${detail}`);
    this.name = "BrandPackError";
  }
}

/** The file types the Hub serves from a pack, by extension. */
export const PACK_FILE_TYPES: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

export interface LoadedBrandPack {
  /** The pack folder, resolved. */
  readonly dir: string;
  readonly pack: BrandPack;
  /** Short hash of brand.json and the files it names; changes when any of them does. */
  readonly fingerprint: string;
  /** Pack-relative name -> MIME type, for every file the pack names. */
  readonly files: ReadonlyMap<string, string>;
}

export function readBrandPack(dir: string): LoadedBrandPack {
  const root = resolveDir(dir);
  const raw = readBrandFile(root);
  const parsed = parseBrandPack(parseJson(root, raw));
  if (!parsed.success)
    throw new BrandPackError(root, formatBrandPackIssues(parsed.error));

  const hash = createHash("sha256").update(raw);
  const files = locateFiles(root, parsed.data, hash);
  return {
    dir: root,
    pack: parsed.data,
    fingerprint: hash.digest("hex").slice(0, 12),
    files,
  };
}

/**
 * A pack file's real path, checked again each time: a ConfigMap update swaps
 * the folder a file resolves to, so a path resolved earlier may be gone.
 */
export function locatePackFile(
  dir: string,
  file: string,
): string | { problem: string } {
  const problem = nameProblem(file);
  if (problem) return { problem };
  let real: string;
  try {
    real = realpathSync(path.join(dir, file));
    if (!real.startsWith(dir + path.sep))
      return { problem: "is outside the pack folder" };
    if (!statSync(real).isFile()) return { problem: "is not a file" };
  } catch {
    // Missing, or gone between realpath and stat (a ConfigMap update in flight).
    return { problem: "not found" };
  }
  return real;
}

function nameProblem(file: string): string | null {
  if (file.split("/").some((segment) => segment === "" || segment === "."))
    return "has an empty or '.' segment";
  if (!PACK_FILE_TYPES[path.extname(file).toLowerCase()])
    return `is not a ${SERVED_TYPES} file`;
  return null;
}

/** Each named file's type; each file's bytes feed the fingerprint. */
function locateFiles(
  root: string,
  pack: BrandPack,
  hash: Hash,
): Map<string, string> {
  const files = new Map<string, string>();
  const problems: string[] = [];
  for (const { field, file } of packFiles(pack)) {
    const bytes = readPackFile(root, file);
    if (typeof bytes === "string") {
      problems.push(`${field}: ${file} ${bytes}`);
    } else {
      files.set(file, PACK_FILE_TYPES[path.extname(file).toLowerCase()]);
      hash.update(`${file}:${bytes.length}:`).update(bytes);
    }
  }
  if (problems.length > 0) throw new BrandPackError(root, problems.join("\n"));
  return files;
}

/** Every file a pack names, with the field that names it. */
export function packFiles(pack: BrandPack): { field: string; file: string }[] {
  const assets = pack.assets ?? {};
  const named: [string, string | undefined][] = [
    ["assets.logo.light", assets.logo?.light],
    ["assets.logo.dark", assets.logo?.dark],
    ["assets.icon", assets.icon],
    ["assets.ogImage", assets.ogImage],
  ];
  return named.flatMap(([field, file]) => (file ? [{ field, file }] : []));
}

function resolveDir(dir: string): string {
  try {
    return realpathSync(dir);
  } catch {
    throw new BrandPackError(dir, "(root): the folder does not exist");
  }
}

function readBrandFile(root: string): string {
  try {
    return readFileSync(path.join(root, BRAND_FILE), "utf8");
  } catch {
    throw new BrandPackError(root, `(root): ${BRAND_FILE} not found`);
  }
}

function parseJson(root: string, raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BrandPackError(
      root,
      `(root): ${BRAND_FILE} is not valid JSON (${reason})`,
    );
  }
}

/** The file's bytes, or why it cannot be served. */
function readPackFile(root: string, file: string): Buffer | string {
  const located = locatePackFile(root, file);
  if (typeof located !== "string") return located.problem;
  try {
    return readFileSync(located);
  } catch {
    return "not found";
  }
}
