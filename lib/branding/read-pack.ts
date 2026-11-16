/**
 * Reads and checks a brand pack folder. Shared by the Hub's loader and
 * `pnpm brand:validate`, so both report the same field paths. No `@/` imports:
 * `scripts/brand-pack.mjs` bundles this file.
 */
import { createHash, type Hash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import {
  BrandPackSchema,
  formatBrandPackIssues,
  type BrandPack,
} from "./schema";

export const BRAND_FILE = "brand.json";

export class BrandPackError extends Error {
  constructor(dir: string, detail: string) {
    super(`Invalid brand pack in ${dir}:\n${detail}`);
    this.name = "BrandPackError";
  }
}

export interface LoadedBrandPack {
  /** The pack folder, resolved. */
  readonly dir: string;
  readonly pack: BrandPack;
  /** Short hash of brand.json and its files; changes whenever the pack does. */
  readonly fingerprint: string;
  /** Pack file name -> absolute path, for every file the pack names. */
  readonly files: ReadonlyMap<string, string>;
}

export function readBrandPack(dir: string): LoadedBrandPack {
  const root = resolveDir(dir);
  const raw = readBrandFile(root);
  const parsed = BrandPackSchema.safeParse(parseJson(root, raw));
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

/** Every named file's real path; each file's mtime feeds the fingerprint. */
function locateFiles(
  root: string,
  pack: BrandPack,
  hash: Hash,
): Map<string, string> {
  const files = new Map<string, string>();
  const problems: string[] = [];
  for (const { field, file } of packFiles(pack)) {
    const located = locate(root, file);
    if (typeof located === "string") {
      files.set(file, located);
      hash.update(file).update(String(statSync(located).mtimeMs));
    } else {
      problems.push(`${field}: ${file} ${located.problem}`);
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

/** The file's real path, or why it cannot be served. Symlinks must stay inside the pack. */
function locate(root: string, file: string): string | { problem: string } {
  let real: string;
  try {
    real = realpathSync(path.join(root, file));
  } catch {
    return { problem: "not found" };
  }
  if (!real.startsWith(root + path.sep))
    return { problem: "is outside the pack folder" };
  if (!statSync(real).isFile()) return { problem: "is not a file" };
  return real;
}
