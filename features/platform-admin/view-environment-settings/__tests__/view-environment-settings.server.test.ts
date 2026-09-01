import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiConfigCacheForTests } from "@/features/config/api-config";
import type { PlatformAdminSession } from "../../types";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

/** Public keys — already serialised into every public form page by ClientEndatixConfig. */
const PUBLIC_POSTHOG_KEY = "phc_public_posthog_project_key_12345";
const PUBLIC_RECAPTCHA_KEY = "6LeIxAcTAgIJdY59xT0QLn_aJcKdPqNo";
/** The one genuine secret — server-only, must never appear in the summary. */
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

  it("carries public keys but never the SurveyJS licence", async () => {
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    process.env.ENDATIX_POSTHOG_KEY = PUBLIC_POSTHOG_KEY;
    process.env.ENDATIX_POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.ENDATIX_POSTHOG_UI_HOST = "https://eu.posthog.com";
    process.env.ENDATIX_RECAPTCHA_SITE_KEY = PUBLIC_RECAPTCHA_KEY;
    process.env.ENDATIX_SURVEY_LICENSE_KEY = SECRET_SURVEY_LICENSE;
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
    process.env.ENDATIX_IS_DEBUG_MODE = "true";
    process.env.NODE_ENV = "test";

    const { getEnvironmentSettings } =
      await import("../view-environment-settings.server");

    const summary = await getEnvironmentSettings(mockSession);
    const serialized = JSON.stringify(summary);

    // The licence is the only value the browser never sees, so it is the only one
    // that must not survive serialisation.
    expect(serialized).not.toContain(SECRET_SURVEY_LICENSE);
    expect(summary.surveyJs.license.configured).toBe(true);

    // The public keys are shown: this page is where an operator confirms which key
    // is live, and both are already in the HTML of every public form.
    expect(summary.analytics.posthogKey).toBe(PUBLIC_POSTHOG_KEY);
    expect(summary.recaptcha.siteKey).toBe(PUBLIC_RECAPTCHA_KEY);
    expect(summary.analytics.posthogHost).toBe("https://eu.i.posthog.com");
    expect(summary.analytics.posthogUiHost).toBe("https://eu.posthog.com");
    expect(summary.experimental.extensionsEnabled).toBe(true);
    expect(summary.debug.isDebugMode).toBe(true);
    expect(summary.debug.nodeEnv).toBe("test");
    expect(summary.api.apiConfigured).toBe(true);
    expect(summary.api.apiUrl).toContain("api.example.com");
  });

  it("reports empty public keys and an unconfigured licence when unset", async () => {
    delete process.env.ENDATIX_POSTHOG_KEY;
    delete process.env.ENDATIX_RECAPTCHA_SITE_KEY;
    delete process.env.ENDATIX_SURVEY_LICENSE_KEY;
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;

    const { getEnvironmentSettings } =
      await import("../view-environment-settings.server");

    const summary = await getEnvironmentSettings(mockSession);

    expect(summary.analytics.posthogKey).toBe("");
    expect(summary.recaptcha.siteKey).toBe("");
    expect(summary.surveyJs.license.configured).toBe(false);
    expect(summary.api.apiConfigured).toBe(false);
  });
});
