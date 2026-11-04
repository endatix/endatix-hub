// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const HUB = path.join(__dirname, "../..");
const SPEC = "e2e/tests/hosting/visitor-ip.spec.ts";
const PLAYWRIGHT_CLI = createRequire(path.join(HUB, "package.json")).resolve(
  "@playwright/test/cli",
);
const TIMEOUT_MS = 50_000;

// Build & Test runs no Playwright specs, so this runs the one spec that needs
// no app, under Playwright's own loader (endatix-hub#1323).
describe("visitor IP lookup in the e2e context", () => {
  it(
    "loads under Playwright",
    () => {
      // Arrange
      const output = mkdtempSync(path.join(os.tmpdir(), "visitor-ip-e2e-"));

      // Act
      const run = spawnSync(
        process.execPath,
        [
          PLAYWRIGHT_CLI,
          "test",
          SPEC,
          "--project=chromium",
          "--reporter=line",
          "--workers=1",
          `--output=${output}`,
        ],
        {
          cwd: HUB,
          encoding: "utf8",
          timeout: TIMEOUT_MS,
          // No CI retries: a pass on retry would hide a broken first load.
          env: { ...process.env, CI: "" },
        },
      );

      // Assert
      expect(run.status, run.stdout + run.stderr).toBe(0);
    },
    TIMEOUT_MS + 10_000,
  );
});
