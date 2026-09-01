import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  EndatixConfigProvider,
  useEndatixConfig,
} from "../endatix-config-provider";
import {
  EMPTY_CLIENT_ENDATIX_CONFIG,
  getBrowserEndatixConfig,
  resetBrowserEndatixConfigForTests,
  toClientEndatixConfig,
  type ClientEndatixConfig,
} from "@/features/config/client-endatix-config";

/** Only the fields a case cares about; the rest fall back to the empty projection. */
function config(
  overrides: Partial<ClientEndatixConfig> = {},
): ClientEndatixConfig {
  return { ...EMPTY_CLIENT_ENDATIX_CONFIG, ...overrides };
}

function wrapper(value: ClientEndatixConfig) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <EndatixConfigProvider value={value}>{children}</EndatixConfigProvider>
    );
  };
}

describe("EndatixConfigProvider", () => {
  afterEach(() => {
    resetBrowserEndatixConfigForTests();
  });

  it("projects only the public fields into context and the browser getter", () => {
    const expected = config({
      apiBaseUrl: "https://api.example.com/api",
      extensionsEnabled: true,
      recaptchaSiteKey: "recaptcha-site-key",
      posthogKey: "posthog-key",
    });
    // Sentinels: both must be dropped by the projection. Without an explicit
    // surveyLicenseKey here the assertion below would pass vacuously.
    const extra = {
      ...expected,
      secret: "do-not-leak",
      surveyLicenseKey: "do-not-project",
    };

    const { result } = renderHook(() => useEndatixConfig(), {
      wrapper: wrapper(extra),
    });

    expect(result.current).toEqual(expected);
    expect(result.current).not.toHaveProperty("secret");
    // The SurveyJS licence key is a commercial credential and this projection is
    // serialised into the HTML of every public form page. It belongs to
    // SurveyLicenseProvider, mounted only by the authenticated shell.
    expect(result.current).not.toHaveProperty("surveyLicenseKey");
    expect(getBrowserEndatixConfig()).toEqual(result.current);
  });

  it("keeps a stable context value when the parent rerenders with the same fields", () => {
    const seen: unknown[] = [];

    function Consumer() {
      seen.push(useEndatixConfig());
      return null;
    }

    const { rerender } = render(
      <EndatixConfigProvider
        value={config({
          apiBaseUrl: "https://a.example/api",
          extensionsEnabled: true,
        })}
      >
        <Consumer />
      </EndatixConfigProvider>,
    );

    rerender(
      <EndatixConfigProvider
        value={config({
          apiBaseUrl: "https://a.example/api",
          extensionsEnabled: true,
        })}
      >
        <Consumer />
      </EndatixConfigProvider>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });

  it("throws when useEndatixConfig is used outside the provider", () => {
    expect(() => renderHook(() => useEndatixConfig())).toThrow(
      /EndatixConfigProvider/,
    );
  });

  it("treats non-boolean extensionsEnabled as off", () => {
    expect(
      toClientEndatixConfig(
        config({
          apiBaseUrl: "https://api.example.com/api",
          extensionsEnabled: "true" as unknown as boolean,
        }),
      ).extensionsEnabled,
    ).toBe(false);
  });
});
