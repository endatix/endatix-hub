import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EnvironmentAdminSummary } from "../types";
import { EnvironmentSettingsPanel } from "../ui/environment-settings-panel";

const SECRET_POSTHOG_KEY = "phc_must_not_appear_in_dom";
const SECRET_RECAPTCHA_KEY = "6Le_must_not_appear_either";
const SECRET_SURVEY_LICENSE = "slk_must_not_leak";

function buildSummary(
  overrides: Partial<{
    posthogConfigured: boolean;
    recaptchaConfigured: boolean;
    licenseConfigured: boolean;
  }> = {},
): EnvironmentAdminSummary {
  const {
    posthogConfigured = true,
    recaptchaConfigured = true,
    licenseConfigured = true,
  } = overrides;

  return Object.freeze({
    api: Object.freeze({
      apiUrl: "https://api.example.com/api",
      apiConfigured: true,
      baseUrl: "https://api.example.com",
      prefix: "/api",
    }),
    experimental: Object.freeze({ extensionsEnabled: false }),
    debug: Object.freeze({ isDebugMode: false, nodeEnv: "test" }),
    analytics: Object.freeze({
      posthogKey: Object.freeze({ configured: posthogConfigured }),
      posthogHost: "https://us.i.posthog.com",
      posthogUiHost: "https://us.posthog.com",
    }),
    recaptcha: Object.freeze({
      siteKey: Object.freeze({ configured: recaptchaConfigured }),
    }),
    surveyJs: Object.freeze({
      license: Object.freeze({ configured: licenseConfigured }),
    }),
  });
}

describe("EnvironmentSettingsPanel", () => {
  it("renders Set / Not set badges without secret values in the document", () => {
    render(<EnvironmentSettingsPanel summary={buildSummary()} />);

    expect(screen.getAllByText("Set")).toHaveLength(3);
    expect(screen.queryByText(SECRET_POSTHOG_KEY)).toBeNull();
    expect(screen.queryByText(SECRET_RECAPTCHA_KEY)).toBeNull();
    expect(screen.queryByText(SECRET_SURVEY_LICENSE)).toBeNull();
    expect(screen.getByText("PostHog host")).toBeDefined();
    expect(screen.getByText("https://us.i.posthog.com")).toBeDefined();
  });

  it("shows Not set when secrets are not configured", () => {
    render(
      <EnvironmentSettingsPanel
        summary={buildSummary({
          posthogConfigured: false,
          recaptchaConfigured: false,
          licenseConfigured: false,
        })}
      />,
    );

    expect(screen.getAllByText("Not set")).toHaveLength(3);
  });
});
