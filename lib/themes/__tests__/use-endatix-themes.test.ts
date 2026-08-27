import { renderHook } from "@testing-library/react";
import * as nextThemesModule from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useEndatixCreatorTheme,
  useEndatixSurveyTheme,
} from "../use-endatix-themes";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("useEndatixCreatorTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns light theme when resolvedTheme is 'light'", () => {
    vi.mocked(nextThemesModule.useTheme).mockReturnValue({
      resolvedTheme: "light",
      theme: "light",
      setTheme: vi.fn(),
      forcedTheme: undefined,
      themes: ["light", "dark"],
      systemTheme: "light",
    });

    const { result } = renderHook(() => useEndatixCreatorTheme());
    expect(result.current.themeName).toBe("default");
    expect(result.current.colorPalette).toBe("light");
    expect(result.current.isLight).toBe(true);
  });

  it("returns dark theme when resolvedTheme is 'dark'", () => {
    vi.mocked(nextThemesModule.useTheme).mockReturnValue({
      resolvedTheme: "dark",
      theme: "dark",
      setTheme: vi.fn(),
      forcedTheme: undefined,
      themes: ["light", "dark"],
      systemTheme: "light",
    });

    const { result } = renderHook(() => useEndatixCreatorTheme());
    expect(result.current.themeName).toBe("default");
    expect(result.current.colorPalette).toBe("dark");
    expect(result.current.isLight).toBe(false);
  });
});

describe("useEndatixSurveyTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns light theme when resolvedTheme is 'light'", () => {
    vi.mocked(nextThemesModule.useTheme).mockReturnValue({
      resolvedTheme: "light",
      theme: "light",
      setTheme: vi.fn(),
      forcedTheme: undefined,
      themes: ["light", "dark"],
      systemTheme: "light",
    });

    const { result } = renderHook(() => useEndatixSurveyTheme());
    expect(result.current.themeName).toBe("endatix-survey-light");
  });

  it("returns dark theme when resolvedTheme is 'dark'", () => {
    vi.mocked(nextThemesModule.useTheme).mockReturnValue({
      resolvedTheme: "dark",
      theme: "dark",
      setTheme: vi.fn(),
      forcedTheme: undefined,
      themes: ["light", "dark"],
      systemTheme: "light",
    });

    const { result } = renderHook(() => useEndatixSurveyTheme());
    expect(result.current.themeName).toBe("endatix-survey-dark");
  });
});
