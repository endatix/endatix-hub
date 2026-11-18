import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as string[]);

vi.mock("@/features/config/legacy-public-env.server", () => ({
  applyLegacyPublicEnv: () => calls.push("applyLegacyPublicEnv"),
}));
vi.mock("@/lib/branding/deployment-pack.server", () => ({
  assertBrandPackAtStartup: () => calls.push("assertBrandPackAtStartup"),
}));
vi.mock("@/lib/survey-features/safe-html", () => ({}));
vi.mock("@/lib/hosting/check-node-version", () => ({}));
vi.mock("@/lib/hosting/check-environment", () => ({}));
vi.mock("@/lib/hosting/visitor-ip.server", () => ({
  registerVisitorIpForwarding: () => {},
}));
vi.mock("@/instrumentation.node", () => ({}));
vi.mock("@/auth", () => ({}));
vi.mock("@/features/auth/infrastructure/log-auth-providers", () => ({
  logAuthProviders: () => {},
}));

/** An invalid pack must stop the Hub at start, after env normalisation. */
describe("brand pack startup wiring", () => {
  it("checks the mounted pack when the Node server registers", async () => {
    // Arrange
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const { register } = await import("@/instrumentation");

    // Act
    await register();

    // Assert
    expect(calls).toEqual(["applyLegacyPublicEnv", "assertBrandPackAtStartup"]);
  });
});
