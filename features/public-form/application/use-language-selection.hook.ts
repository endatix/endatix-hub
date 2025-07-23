import { useCallback, useEffect, useMemo, useState } from "react";
import { SurveyModel } from "survey-core";
import { surveyLocalization } from "survey-core";

const STORAGE_KEY = "form-lang-preference";
const DEFAULT_LOCALE = "en";

interface UseLanguageSelectionProps {
  availableLocales: string[];
  surveyModel: SurveyModel | null;
  preselectedLocale?: string;
}

/**
 * React hook for managing language selection in a survey context.
 *
 * @param availableLocales - List of supported locale codes (e.g., ['en', 'sv']).
 * @param surveyModel - The SurveyModel instance to synchronize locale with.
 * @param preselectedLocale - (Optional) Locale code to prioritize as initial selection.
 * @returns {
 *   currentLocale: string, // The currently selected locale code.
 *   changeLocale: (locale: string) => void // Function to update the locale.
 *   languageOptions: LanguageOption[] // List of available language options.
 *   currentOption: LanguageOption | undefined // The currently selected language option.
 *   hasMultipleLocales: boolean // Whether there are multiple locales available.
 * }
 *
 * Usage:
 *   const { currentLocale, changeLocale } = useLanguageSelection({ ... });
 */

export function useLanguageSelection({
  availableLocales,
  surveyModel,
  preselectedLocale,
}: UseLanguageSelectionProps) {
  const [currentLocale, setCurrentLocale] = useState<string>(
    surveyLocalization.defaultLocale || DEFAULT_LOCALE,
  );

  const changeLocale = useCallback(
    (newLocale: string) => {
      if (!surveyModel || !availableLocales.includes(newLocale)) {
        return;
      }

      setCurrentLocale(newLocale);
      surveyModel.locale = newLocale;
      localStorage.setItem(STORAGE_KEY, newLocale);
    },
    [surveyModel, availableLocales],
  );

  useEffect(() => {
    if (!surveyModel || availableLocales.length === 0) {
      return;
    }

    // Priority: order of preference:
    //  1. Server-provided initial locale
    //  2. Saved locale (in localStorage)
    //  3. Survey model locale
    //  4. Browser detection (fallback)
    let localeToSelect = DEFAULT_LOCALE;

    // 1. Server-provided initial locale. Requires server-side processing. TODO: Implement.
    if (preselectedLocale && availableLocales.includes(preselectedLocale)) {
      localeToSelect = preselectedLocale;
    } else {
      const preferredLocale = localStorage.getItem(STORAGE_KEY);
      if (preferredLocale && availableLocales.includes(preferredLocale)) {
        localeToSelect = preferredLocale;
      } else if (
        surveyModel.locale &&
        availableLocales.includes(surveyModel.locale)
      ) {
        localeToSelect = surveyModel.locale;
      } else {
        localeToSelect = getBrowserPreferredLocale(availableLocales);
      }
    }

    // Use changeLocale to maintain consistency and avoid code duplication
    changeLocale(localeToSelect);
  }, [surveyModel, availableLocales, preselectedLocale, changeLocale]);

  // Language options
  const languageOptions = useMemo(() => {
    const localeNames = surveyLocalization.localeNames;
    return availableLocales.map((localeCode) => ({
      value: localeCode,
      label: localeNames[localeCode] || localeCode,
    }));
  }, [availableLocales]);

  const currentOption = useMemo(() => {
    return languageOptions.find((option) => option.value === currentLocale);
  }, [languageOptions, currentLocale]);

  return {
    currentLocale,
    currentOption,
    languageOptions,
    changeLocale,
    hasMultipleLocales: languageOptions.length > 1,
  };
}

function getBrowserPreferredLocale(availableLocales: string[]): string {
  if (typeof window === "undefined" || availableLocales.length === 0) {
    return DEFAULT_LOCALE;
  }

  const browserLanguages = navigator.languages || [navigator.language];

  for (const browserLang of browserLanguages) {
    if (availableLocales.includes(browserLang)) {
      return browserLang;
    }

    const languageCode = browserLang.split("-")[0];
    if (availableLocales.includes(languageCode)) {
      return languageCode;
    }
  }

  return availableLocales.includes(DEFAULT_LOCALE)
    ? DEFAULT_LOCALE
    : availableLocales[0];
}
