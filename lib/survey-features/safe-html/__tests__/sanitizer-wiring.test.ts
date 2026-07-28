import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The sanitizer only protects the app if it is actually installed at startup.
 * Every other test in this folder installs it explicitly, so dropping the
 * instrumentation wiring would silently reintroduce the vulnerability while
 * leaving the suite green. This test fails loudly in that case.
 */
const SAFE_HTML_MODULE = "@/lib/survey-features/safe-html";

const ENTRY_POINTS = [
  ["client", "instrumentation-client.ts"],
  ["server", "instrumentation.ts"],
] as const;

describe("survey HTML sanitizer wiring", () => {
  it.each(ENTRY_POINTS)(
    "is installed from the %s instrumentation entry point",
    (_runtime, file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");

      expect(source).toContain(SAFE_HTML_MODULE);
    },
  );
});
