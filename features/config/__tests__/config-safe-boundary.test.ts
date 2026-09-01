import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CONFIG_ROOT = path.resolve(__dirname, "..");

/**
 * Config-safe modules are loaded by `next.config.ts`, which runs in plain Node before any
 * Next request context exists. `next/server` and `server-only` both throw there, so a
 * stray import breaks `next build` rather than failing a type check.
 *
 * `client-endatix-config.ts` is on the list because `resolve-endatix-settings.ts` imports
 * it for the browser projection, which puts it in the same load chain.
 */
const CONFIG_SAFE_MODULES = [
  "endatix-config.ts",
  "resolve-endatix-settings.ts",
  "client-endatix-config.ts",
];

const FORBIDDEN_IMPORTS = [
  { name: "next/server", pattern: /from\s+["']next\/server["']/ },
  { name: "server-only", pattern: /["']server-only["']/ },
];

describe("config-safe modules", () => {
  it.each(CONFIG_SAFE_MODULES)(
    "%s stays importable from next.config.ts",
    (fileName) => {
      const source = readFileSync(path.join(CONFIG_ROOT, fileName), "utf-8");

      for (const { name, pattern } of FORBIDDEN_IMPORTS) {
        expect(
          pattern.test(source),
          `${fileName} imports ${name}, which next.config.ts cannot load.`,
        ).toBe(false);
      }
    },
  );
});
