import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SurveyLicenseProvider,
  resetSurveyLicenseWarningForTests,
  useSurveyLicenseKey,
} from "../survey-license-provider";

function withProvider(value: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SurveyLicenseProvider value={value}>{children}</SurveyLicenseProvider>
    );
  };
}

describe("useSurveyLicenseKey", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetSurveyLicenseWarningForTests();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("returns the configured key inside a provider", () => {
    const { result } = renderHook(() => useSurveyLicenseKey(), {
      wrapper: withProvider("slk_configured"),
    });

    expect(result.current).toBe("slk_configured");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when no provider is mounted", () => {
    // The wiring bug this guard exists for: the route renders Creator unlicensed and
    // nothing else says so. Exactly how the template editor shipped unlicensed.
    const { result } = renderHook(() => useSurveyLicenseKey());

    expect(result.current).toBe("");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("SurveyLicenseProvider");
  });

  it("stays silent when a provider supplies an empty key", () => {
    // An unlicensed deployment is a supported state, not a bug. Warning here would
    // train everyone to ignore the message that does matter.
    const { result } = renderHook(() => useSurveyLicenseKey(), {
      wrapper: withProvider(""),
    });

    expect(result.current).toBe("");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once, however many consumers render without a provider", () => {
    function Consumer() {
      useSurveyLicenseKey();
      return null;
    }

    render(
      <>
        <Consumer />
        <Consumer />
        <Consumer />
      </>,
    );

    expect(warn).toHaveBeenCalledOnce();
  });
});
