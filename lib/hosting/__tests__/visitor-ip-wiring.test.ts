import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Outbound API calls forward the visitor address only once the server
 * registers it at startup. Every other visitor-IP test registers it itself,
 * so dropping the instrumentation call would stop forwarding while leaving the
 * suite green. This test fails in that case.
 */
describe("visitor IP forwarding wiring", () => {
  it("is registered from the server instrumentation entry point", () => {
    // Act
    const source = readFileSync(
      path.join(process.cwd(), "instrumentation.ts"),
      "utf8",
    );

    // Assert
    expect(source).toContain("@/lib/hosting/visitor-ip.server");
    expect(source).toContain("registerVisitorIpForwarding()");
  });
});
