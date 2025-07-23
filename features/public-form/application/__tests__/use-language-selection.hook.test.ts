import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import { surveyLocalization } from "survey-core";
import { useLanguageSelection } from "../use-language-selection.hook";

// Mock SurveyJS localization
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
        fr: "Français",
      },
    },
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe("useLanguageSelection", () => {
  const mockSurveyModel = {
    locale: "en",
  } as SurveyModel;

  let languagesSpy: ReturnType<typeof vi.spyOn>;
  let languageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset survey model locale
    mockSurveyModel.locale = "en";
    // Mock localStorage
    vi.stubGlobal("localStorage", mockLocalStorage);

    // Setup navigator spies
    languagesSpy = vi.spyOn(navigator, "languages", "get");
    languageSpy = vi.spyOn(navigator, "language", "get");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default locale when no survey model", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: null,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
      expect(result.current.hasMultipleLocales).toBe(true);
    });

    it("should prioritize preselected locale", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
          preselectedLocale: "sv",
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "form-lang-preference",
        "sv",
      );
    });

    it("should use saved locale from localStorage when no preselected", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("sv");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("form-lang-preference");
    });

    it("should use survey model locale when no saved preference", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "es";

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("es");
    });

    it("should fall back to default locale when no other preferences", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
    });

    it("should use first available locale when default not available", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });
  });

  describe("browser preferred locale detection", () => {
    it("should match exact browser language", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["sv-SE", "en-US"]);
      languageSpy.mockReturnValue("sv-SE");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should match language code when exact match not available", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["sv-SE", "en-US"]);
      languageSpy.mockReturnValue("sv-SE");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should match first available language from navigator.languages", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["fr-FR", "sv-SE", "en-US"]);
      languageSpy.mockReturnValue("fr-FR");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should fall back to default locale when no browser match", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["fr-FR", "de-DE"]);
      languageSpy.mockReturnValue("fr-FR");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
    });

    it("should use first available locale when default not available", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["fr-FR", "de-DE"]);
      languageSpy.mockReturnValue("fr-FR");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should handle navigator.languages being undefined", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(undefined);
      languageSpy.mockReturnValue("sv-SE");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should handle navigator.language being undefined", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["sv-SE", "en-US"]);
      languageSpy.mockReturnValue(undefined);

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should handle both navigator.languages and navigator.language being undefined", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(undefined);
      languageSpy.mockReturnValue(undefined);

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
    });

    it("should match 'en' from 'en-US'", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["en-US", "sv-SE"]);
      languageSpy.mockReturnValue("en-US");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
    });

    it("should match 'sv' from 'sv-SE'", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["sv-SE", "en-US"]);
      languageSpy.mockReturnValue("sv-SE");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv");
    });

    it("should match 'es' from 'es-ES'", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["es-ES", "en-US"]);
      languageSpy.mockReturnValue("es-ES");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("es");
    });

    it("should check navigator.languages in order", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSurveyModel.locale = "fr"; // Not in available locales
      languagesSpy.mockReturnValue(["fr-FR", "sv-SE", "en-US"]);
      languageSpy.mockReturnValue("fr-FR");

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("sv"); // Should match sv-SE, not fall back to en
    });
  });

  describe("changeLocale", () => {
    it("should update locale and persist to localStorage", () => {
      // Arrange
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Act
      act(() => {
        result.current.changeLocale("sv");
      });

      // Assert
      expect(result.current.currentLocale).toBe("sv");
      expect(mockSurveyModel.locale).toBe("sv");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "form-lang-preference",
        "sv",
      );
    });

    it("should not update locale if not in available locales", () => {
      // Arrange
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      const initialLocale = result.current.currentLocale;

      // Act
      act(() => {
        result.current.changeLocale("fr");
      });

      // Assert
      expect(result.current.currentLocale).toBe(initialLocale);
      expect(mockSurveyModel.locale).not.toBe("fr");
    });

    it("should not update locale if no survey model", () => {
      // Arrange
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: null,
        }),
      );

      const initialLocale = result.current.currentLocale;

      // Act
      act(() => {
        result.current.changeLocale("sv");
      });

      // Assert
      expect(result.current.currentLocale).toBe(initialLocale);
    });
  });

  describe("languageOptions", () => {
    it("should return formatted language options", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.languageOptions).toEqual([
        { value: "en", label: "English" },
        { value: "sv", label: "Svenska" },
        { value: "es", label: "Español" },
      ]);
    });

    it("should fall back to locale code when name not available", () => {
      // Arrange
      vi.mocked(surveyLocalization.localeNames).fr = undefined;

      // Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "fr"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.languageOptions).toEqual([
        { value: "en", label: "English" },
        { value: "fr", label: "fr" },
      ]);
    });
  });

  describe("currentOption", () => {
    it("should return current language option", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.currentOption).toEqual({
        value: "en",
        label: "English",
      });
    });

    it("should update current option when locale changes", () => {
      // Arrange
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Act
      act(() => {
        result.current.changeLocale("sv");
      });

      // Assert
      expect(result.current.currentOption).toEqual({
        value: "sv",
        label: "Svenska",
      });
    });
  });

  describe("hasMultipleLocales", () => {
    it("should return true when multiple locales available", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv", "es"],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.hasMultipleLocales).toBe(true);
    });

    it("should return false when only one locale available", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en"],
          surveyModel: null,
        }),
      );

      // Assert
      expect(result.current.hasMultipleLocales).toBe(false);
    });

    it("should return false when no locales available", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: [],
          surveyModel: mockSurveyModel,
        }),
      );

      // Assert
      expect(result.current.hasMultipleLocales).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty available locales", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: [],
          surveyModel: null,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
      expect(result.current.hasMultipleLocales).toBe(false);
      expect(result.current.languageOptions).toEqual([]);
      expect(result.current.currentOption).toBeUndefined();
    });

    it("should handle null survey model", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: null,
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
      expect(result.current.hasMultipleLocales).toBe(true);
    });

    it("should handle invalid preselected locale", () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLanguageSelection({
          availableLocales: ["en", "sv"],
          surveyModel: mockSurveyModel,
          preselectedLocale: "invalid",
        }),
      );

      // Assert
      expect(result.current.currentLocale).toBe("en");
    });
  });
});
