import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetResolveEndatixSettingsCacheForTests } from "@/features/config/resolve-endatix-settings";
import { getEnvironmentSettings } from "../view-environment-settings.server";
import type { PlatformAdminSession } from "../../types";

describe("getEnvironmentSettings", () => {
  const originalEnv = { ...process.env };
  const session = {} as PlatformAdminSession;

  beforeEach(() => {
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;
    delete process.env.ENDATIX_ENABLE_EXTENSIONS;
  });

  afterEach(() => {
    resetResolveEndatixSettingsCacheForTests();
    process.env = { ...originalEnv };
  });

  it("reports API configured with origin and prefix from ENDATIX_BASE_URL", async () => {
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    process.env.ENDATIX_API_PREFIX = "/api";

    const summary = await getEnvironmentSettings(session);

    expect(summary.apiConfigured).toBe(true);
    expect(summary.apiUrl).toBe("https://api.example.com/api");
    expect(summary.baseUrl).toBe("https://api.example.com");
    expect(summary.prefix).toBe("/api");
  });

  it("reports API configured from ENDATIX_API_URL alone", async () => {
    process.env.ENDATIX_API_URL = "https://helm.example.com/api";

    const summary = await getEnvironmentSettings(session);

    expect(summary.apiConfigured).toBe(true);
    expect(summary.apiUrl).toBe("https://helm.example.com/api");
    expect(summary.baseUrl).toBe("https://helm.example.com");
    expect(summary.prefix).toBe("/api");
  });

  it("reports API not configured when origin env is missing", async () => {
    const summary = await getEnvironmentSettings(session);

    expect(summary.apiConfigured).toBe(false);
    expect(summary.apiUrl).toBe("");
    expect(summary.baseUrl).toBeNull();
    expect(summary.prefix).toBeNull();
  });

  it("reports API not configured when ENDATIX_API_URL is invalid", async () => {
    process.env.ENDATIX_API_URL = "not-a-url";

    const summary = await getEnvironmentSettings(session);

    expect(summary.apiConfigured).toBe(false);
    expect(summary.apiUrl).toBe("");
  });

  it("reports extensions disabled by default", async () => {
    process.env.ENDATIX_API_URL = "https://api.example.com/api";

    const summary = await getEnvironmentSettings(session);

    expect(summary.extensionsEnabled).toBe(false);
  });

  it("reports extensions enabled when ENDATIX_ENABLE_EXTENSIONS is true", async () => {
    process.env.ENDATIX_API_URL = "https://api.example.com/api";
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";

    const summary = await getEnvironmentSettings(session);

    expect(summary.extensionsEnabled).toBe(true);
  });
});
