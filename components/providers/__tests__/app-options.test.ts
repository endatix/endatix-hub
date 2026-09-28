import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceFiles } from "@/features/config/__tests__/support/scan-source-files";
import { AppOptions } from "../app-options";

const ROOT = path.resolve(__dirname, "../../..");

describe("AppOptions", () => {
  it("lives outside the client module, so server layouts get the real object", () => {
    // A value exported from a "use client" file reaches a server layout as a client
    // reference. PublicPages then silently became AppProvider's all-on defaults.
    const source = readFileSync(
      path.join(ROOT, "components/providers/app-options.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is never imported from app-provider", () => {
    const offenders = scanSourceFiles(
      ROOT,
      /import\s*\{[^}]*\bAppOptions\b[^}]*\}\s*from\s*["'][^"']*app-provider["']/,
    );

    expect(offenders).toEqual([]);
  });

  it("keeps the theme provider off every public preset", () => {
    expect(AppOptions.PublicPages.enableTheme).toBe(false);
    expect(AppOptions.StatusPages.enableTheme).toBe(false);
  });
});
