import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * A fresh brand pack folder per test, mounted as ENDATIX_BRAND_DIR. Call at the
 * top of a test file; `pack.path` is valid inside tests.
 */
export function mountPackDir() {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "brand-pack-"));
    vi.stubEnv("ENDATIX_BRAND_DIR", dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    get path() {
      return dir;
    },
    /** brand.json with `version` and `name` filled in; `mtime` pins its stat. */
    write(pack: Record<string, unknown>, mtime?: Date) {
      const file = path.join(dir, "brand.json");
      writeFileSync(
        file,
        JSON.stringify({ version: 1, name: "Example Forms", ...pack }),
      );
      if (mtime) utimesSync(file, mtime, mtime);
    },
  };
}

export const accent = (value: string) => ({
  tokens: { color: { primary: { $type: "color", $value: value } } },
});
