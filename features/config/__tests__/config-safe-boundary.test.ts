import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CONFIG_ROOT = path.resolve(__dirname, "..");

/** Config-safe modules must stay importable from next.config.ts without next/server. */
const CONFIG_SAFE_MODULES = [
  "endatix-config.ts",
  "resolve-endatix-settings.ts",
];

describe("config-safe modules", () => {
  it.each(CONFIG_SAFE_MODULES)(
    "%s does not import next/server",
    (fileName) => {
      const source = readFileSync(path.join(CONFIG_ROOT, fileName), "utf-8");
      expect(source).not.toMatch(/from\s+["']next\/server["']/);
    },
  );
});
