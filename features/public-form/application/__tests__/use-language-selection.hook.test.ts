import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import { useLanguageSelection } from "../use-language-selection.hook";

vi.mock("survey-core", async () => {
  const actual = await vi.importActual("survey-core");
  return {
    ...actual,
    surveyLocalization: {
      defaultLocale: "en",
      localeNames: {
        en: "English",
        sv: "Svenska",
        es: "Español",
        bg: "български",
        fr: "Français",
      },
    },
  };
});

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe("useLanguageSelection", () => {
  const mockSurveyModel = {
    locale: "",
  } as SurveyModel;

  let languagesSpy: ReturnType<typeof vi.spyOn>;
  let languageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSurveyModel.locale = "";
    vi.stubGlobal("localStorage", mockLocalStorage);
    languagesSpy = vi.spyOn(navigator, "languages", "get");
    languageSpy = vi.spyOn(navigator, "language", "get");
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("uses catalog default when no survey model", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: null,
        }),
      );

      expect(result.current.currentLocale).toBe("default");
      expect(result.current.isDefaultLocale).toBe(true);
      expect(result.current.hasMultipleLocales).toBe(true);
    });

    it("prioritizes preselected locale", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
          preselectedLocale: "sv",
        }),
      );

      expect(result.current.currentLocale).toBe("sv");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockSurveyModel.locale).toBe("sv");
    });

    it("uses saved catalog locale from localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue("sv");

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("sv");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it("migrates legacy localStorage en to catalog default", () => {
      mockLocalStorage.getItem.mockReturnValue("en");

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "bg"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("default");
      expect(mockSurveyModel.locale).toBe("");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it("uses survey model locale when no saved preference", () => {
      mockSurveyModel.locale = "es";

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("es");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it("falls back via browser detection when survey locale is unavailable", () => {
      mockSurveyModel.locale = "fr";
      languagesSpy.mockReturnValue(["fr-FR"]);
      languageSpy.mockReturnValue("fr-FR");

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("default");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it("falls back to the first catalog locale when the default is unavailable", () => {
      mockSurveyModel.locale = "";
      languagesSpy.mockReturnValue(["fr-FR"]);
      languageSpy.mockReturnValue("fr-FR");

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["sv", "bg"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("sv");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("browser preferred locale detection", () => {
    it("matches browser language codes to catalog locales", () => {
      mockSurveyModel.locale = "fr";
      languagesSpy.mockReturnValue(["sv-SE", "en-US"]);
      languageSpy.mockReturnValue("sv-SE");

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("sv");
    });

    it("maps browser en-US to catalog default", () => {
      mockSurveyModel.locale = "fr";
      languagesSpy.mockReturnValue(["en-US"]);
      languageSpy.mockReturnValue("en-US");

      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("default");
    });
  });

  describe("changeLocale", () => {
    it("updates catalog locale, survey model, and localStorage", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      act(() => {
        result.current.changeLocale("sv");
      });

      expect(result.current.currentLocale).toBe("sv");
      expect(mockSurveyModel.locale).toBe("sv");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "form-lang-preference",
        "sv",
      );
    });

    it("sets survey locale to empty string for catalog default", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "bg"],
          surveyModel: mockSurveyModel,
          preselectedLocale: "bg",
        }),
      );

      expect(result.current.currentLocale).toBe("bg");

      act(() => {
        result.current.changeLocale("default");
      });

      expect(result.current.currentLocale).toBe("default");
      expect(mockSurveyModel.locale).toBe("");
    });

    it("accepts legacy en and normalizes to catalog default", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "bg"],
          surveyModel: mockSurveyModel,
          preselectedLocale: "bg",
        }),
      );

      act(() => {
        result.current.changeLocale("en");
      });

      expect(result.current.currentLocale).toBe("default");
      expect(mockSurveyModel.locale).toBe("");
    });

    it("does not update locale if not in available locales", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      const initialLocale = result.current.currentLocale;

      act(() => {
        result.current.changeLocale("fr");
      });

      expect(result.current.currentLocale).toBe(initialLocale);
      expect(mockSurveyModel.locale).toBe("");
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        "form-lang-preference",
        "fr",
      );
    });
  });

  describe("languageOptions", () => {
    it("exposes catalog codes with SurveyJS display names", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.languageOptions).toEqual([
        { value: "default", label: "English" },
        { value: "sv", label: "Svenska" },
        { value: "es", label: "Español" },
      ]);
    });
  });

  describe("currentOption", () => {
    it("tracks the selected catalog option", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentOption).toEqual({
        value: "default",
        label: "English",
      });

      act(() => {
        result.current.changeLocale("sv");
      });

      expect(result.current.currentOption).toEqual({
        value: "sv",
        label: "Svenska",
      });
    });
  });

  describe("hasMultipleLocales", () => {
    it("is true when multiple catalog locales are available", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.hasMultipleLocales).toBe(true);
    });

    it("is false for a single locale", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en"],
          surveyModel: null,
        }),
      );

      expect(result.current.hasMultipleLocales).toBe(false);
    });

    it("reports no multiple locales and no current option for an empty catalog", () => {
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: [],
          surveyModel: mockSurveyModel,
        }),
      );

      expect(result.current.currentLocale).toBe("default");
      expect(result.current.hasMultipleLocales).toBe(false);
      expect(result.current.languageOptions).toEqual([]);
      expect(result.current.currentOption).toBeUndefined();
    });
  });
});
