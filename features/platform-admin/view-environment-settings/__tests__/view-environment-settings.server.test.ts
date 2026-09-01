import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigCacheForTests } from "@/features/config/api-config";
import type { PlatformAdminSession } from "../../types";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

const SECRET_POSTHOG_KEY = "phc_super_secret_posthog_key_12345";
const SECRET_RECAPTCHA_KEY = "6LeIxAcTAgIJdY59xT0QLn_aJcKdPqNo";
const SECRET_SURVEY_LICENSE = "slk_commercial_surveyjs_license_xyz";

const mockSession = {} as PlatformAdminSession;

describe("getEnvironmentSettings", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetApiConfigCacheForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetApiConfigCacheForTests();
  });

  it("does not leak secret values in JSON.stringify(summary)", async () => {
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    process.env.ENDATIX_POSTHOG_KEY = SECRET_POSTHOG_KEY;
    process.env.ENDATIX_POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.ENDATIX_POSTHOG_UI_HOST = "https://eu.posthog.com";
    process.env.ENDATIX_RECAPTCHA_SITE_KEY = SECRET_RECAPTCHA_KEY;
    process.env.ENDATIX_SURVEY_LICENSE_KEY = SECRET_SURVEY_LICENSE;
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
    process.env.ENDATIX_IS_DEBUG_MODE = "true";
    process.env.NODE_ENV = "test";

    const { getEnvironmentSettings } =
      await import("../view-environment-settings.server");

    const summary = await getEnvironmentSettings(mockSession);
    const serialized = JSON.stringify(summary);

    expect(serialized).not.toContain(SECRET_POSTHOG_KEY);
    expect(serialized).not.toContain(SECRET_RECAPTCHA_KEY);
    expect(serialized).not.toContain(SECRET_SURVEY_LICENSE);

    expect(summary.analytics.posthogKey.configured).toBe(true);
    expect(summary.recaptcha.siteKey.configured).toBe(true);
    expect(summary.surveyJs.license.configured).toBe(true);
    expect(summary.analytics.posthogHost).toBe("https://eu.i.posthog.com");
    expect(summary.analytics.posthogUiHost).toBe("https://eu.posthog.com");
    expect(summary.experimental.extensionsEnabled).toBe(true);
    expect(summary.debug.isDebugMode).toBe(true);
    expect(summary.debug.nodeEnv).toBe("test");
    expect(summary.api.apiConfigured).toBe(true);
    expect(summary.api.apiUrl).toContain("api.example.com");
  });

  it("reports configured: false when secret env vars are empty", async () => {
    delete process.env.ENDATIX_POSTHOG_KEY;
    delete process.env.ENDATIX_RECAPTCHA_SITE_KEY;
    delete process.env.ENDATIX_SURVEY_LICENSE_KEY;
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;

    const { getEnvironmentSettings } =
      await import("../view-environment-settings.server");

    const summary = await getEnvironmentSettings(mockSession);

    expect(summary.analytics.posthogKey.configured).toBe(false);
    expect(summary.recaptcha.siteKey.configured).toBe(false);
    expect(summary.surveyJs.license.configured).toBe(false);
    expect(summary.api.apiConfigured).toBe(false);
  });
});
