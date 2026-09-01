import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEndatixSettings } from "../resolve-endatix-settings";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

describe("getClientEndatixConfig (server barrel)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns the runtime client slice after pinning dynamic rendering", async () => {
    // Arrange
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
    const { connection } = await import("next/server");
    const { getClientEndatixConfig } = await import("../server");

    // Act
    const config = await getClientEndatixConfig();

    // Assert
    expect(connection).toHaveBeenCalledOnce();
    expect(config).toEqual(
      resolveEndatixSettings({ source: "runtime" }).client,
    );
    expect(config).not.toHaveProperty("surveyLicenseKey");
  });
});
