import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EnvironmentAdminSummary } from "../types";
import { EnvironmentSettingsPanel } from "../ui/environment-settings-panel";

const SECRET_POSTHOG_KEY = "phc_must_not_appear_in_dom";
const SECRET_RECAPTCHA_KEY = "6Le_must_not_appear_either";
const SECRET_SURVEY_LICENSE = "slk_must_not_leak";

function buildSummary(
  overrides: Partial<{
    apiConfigured: boolean;
    posthogConfigured: boolean;
    recaptchaConfigured: boolean;
    licenseConfigured: boolean;
  }> = {},
): EnvironmentAdminSummary {
  const {
    apiConfigured = true,
    posthogConfigured = true,
    recaptchaConfigured = true,
    licenseConfigured = true,
  } = overrides;

  return Object.freeze({
    api: Object.freeze({
      apiUrl: apiConfigured ? "https://api.example.com/api" : "",
      apiConfigured,
      baseUrl: apiConfigured ? "https://api.example.com" : null,
      prefix: apiConfigured ? "/api" : null,
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

  it("summarises configured settings and lists what is missing", () => {
    const { container } = render(
      <EnvironmentSettingsPanel
        summary={buildSummary({ posthogConfigured: false })}
      />,
    );

    expect(screen.getByText("3 of 4 configured")).toBeDefined();
    expect(screen.getByText(/Not set: PostHog project key/)).toBeDefined();
    // Optional secrets missing is a neutral state, not an operator alarm.
    expect(container.querySelector('[data-tone="attention"]')).toBeNull();
  });

  it("flags a missing API URL as needing attention", () => {
    const { container } = render(
      <EnvironmentSettingsPanel
        summary={buildSummary({ apiConfigured: false })}
      />,
    );

    expect(screen.getByText("Not configured")).toBeDefined();
    expect(container.querySelectorAll('[data-tone="attention"]')).toHaveLength(
      2,
    );
  });

  it("distinguishes an empty API prefix from an unset one", () => {
    const summary = buildSummary();
    render(
      <EnvironmentSettingsPanel
        summary={{ ...summary, api: { ...summary.api, prefix: "" } }}
      />,
    );

    // An API served at the origin root is configured, not missing.
    expect(screen.getByText("(none)")).toBeDefined();
  });

  it("renders the env var behind every setting as visible text", () => {
    render(<EnvironmentSettingsPanel summary={buildSummary()} />);

    expect(screen.getByText("ENDATIX_POSTHOG_KEY")).toBeDefined();
    expect(screen.getByText("ENDATIX_RECAPTCHA_SITE_KEY")).toBeDefined();
    expect(screen.getByText("ENDATIX_SURVEY_LICENSE_KEY")).toBeDefined();
    expect(screen.getByText("ENDATIX_ENABLE_EXTENSIONS")).toBeDefined();
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
