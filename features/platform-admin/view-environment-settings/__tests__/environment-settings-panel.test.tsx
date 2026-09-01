import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EnvironmentAdminSummary } from "../types";
import { EnvironmentSettingsPanel } from "../ui/environment-settings-panel";

/** Public keys: already in the HTML of every public form, so the page must show them. */
const PUBLIC_POSTHOG_KEY = "phc_public_project_key";
const PUBLIC_RECAPTCHA_KEY = "6Le_public_site_key";
/** The one genuine secret: server-only, must never reach the DOM. */
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
      posthogKey: posthogConfigured ? PUBLIC_POSTHOG_KEY : "",
      posthogHost: "https://us.i.posthog.com",
      posthogUiHost: "https://us.posthog.com",
    }),
    recaptcha: Object.freeze({
      siteKey: recaptchaConfigured ? PUBLIC_RECAPTCHA_KEY : "",
    }),
    surveyJs: Object.freeze({
      license: Object.freeze({ configured: licenseConfigured }),
    }),
  });
}

describe("EnvironmentSettingsPanel", () => {
  it("shows public keys as values and the licence as presence only", () => {
    render(<EnvironmentSettingsPanel summary={buildSummary()} />);

    // Public: hiding these would cost the operator the ability to confirm which key
    // is live, while hiding nothing that is not already in the page source.
    expect(screen.getByText(PUBLIC_POSTHOG_KEY)).toBeDefined();
    expect(screen.getByText(PUBLIC_RECAPTCHA_KEY)).toBeDefined();
    expect(screen.getByText("PostHog host")).toBeDefined();
    expect(screen.getByText("https://us.i.posthog.com")).toBeDefined();

    // Secret: the licence is server-only, so only its presence may be rendered.
    expect(screen.queryByText(SECRET_SURVEY_LICENSE)).toBeNull();
    expect(screen.getAllByText("Set")).toHaveLength(1);
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

    // Only the licence renders a presence badge; the public keys render as "—".
    expect(screen.getAllByText("Not set")).toHaveLength(3);
    expect(
      screen.getAllByText("Not set", { selector: "span.sr-only" }),
    ).toHaveLength(2);
  });
});
