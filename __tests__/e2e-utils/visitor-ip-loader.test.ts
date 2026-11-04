// @vitest-environment node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const HUB = path.join(__dirname, "../..");
const SPEC = "e2e/tests/hosting/visitor-ip.spec.ts";

// Build & Test runs no Playwright specs, so this runs the one spec that needs
// no app, under Playwright's own loader (endatix-hub#1323).
describe("visitor IP lookup in the e2e context", () => {
  it("loads under Playwright", () => {
    const run = spawnSync(
      process.execPath,
      [
        path.join(HUB, "node_modules/@playwright/test/cli.js"),
        "test",
        SPEC,
        "--project=chromium",
        "--reporter=line",
        "--workers=1",
      ],
      { cwd: HUB, encoding: "utf8", env: { ...process.env, CI: "" } },
    );

    expect(run.stdout + run.stderr).toContain("1 passed");
    expect(run.status).toBe(0);
  }, 60_000);
});
