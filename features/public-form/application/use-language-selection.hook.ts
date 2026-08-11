import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SurveyModel } from "survey-core";
import {
  DEFAULT_CATALOG_LOCALE,
  catalogLocaleDisplayName,
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
  toCatalogLocales,
  toSurveyModelLocale,
} from "@/lib/localization";

const STORAGE_KEY = "form-lang-preference";

interface UseLanguageSelectionProps {
  availableLocales: string[];
  surveyModel: SurveyModel | null;
  preselectedLocale?: string;
}

/**
 * React hook for managing language selection in a survey context.
 *
 * Locales use the owned catalog vocabulary (`default`, `bg`, …). SurveyJS
 * `model.locale` stays `""` for the default language.
 *
 * Initial selection priority:
 *  1. Server-provided initial locale
 *  2. Saved locale (localStorage; migrate legacy "en" → "default")
 *  3. Survey model locale
 *  4. Browser detection (fallback)
 *
 * Note: if a saved preference exists but is not in the catalog, we skip the
 * survey model locale and fall through to browser detection.
 */
export function useLanguageSelection({
  availableLocales,
  surveyModel,
  preselectedLocale,
}: UseLanguageSelectionProps) {
  const catalogLocales = useMemo(
    () => toCatalogLocales(availableLocales),
    [availableLocales],
  );

  const [currentLocale, setCurrentLocale] = useState<string>(
    DEFAULT_CATALOG_LOCALE,
  );
  const didInitializeRef = useRef(false);
  const initializedForModelRef = useRef<SurveyModel | null>(null);

  const changeLocale = useCallback(
    (newLocale: string) => {
      const catalogLocale = fromSurveyModelLocale(newLocale);
      if (!surveyModel || !catalogLocales.includes(catalogLocale)) {
        return;
      }

      setCurrentLocale(catalogLocale);
      surveyModel.locale = toSurveyModelLocale(catalogLocale);
      localStorage.setItem(STORAGE_KEY, catalogLocale);
    },
    [surveyModel, catalogLocales],
  );

  useEffect(() => {
    if (!surveyModel || catalogLocales.length === 0) {
      return;
    }

    if (initializedForModelRef.current !== surveyModel) {
      initializedForModelRef.current = surveyModel;
      didInitializeRef.current = false;
    }

    if (didInitializeRef.current) {
      return;
    }
    didInitializeRef.current = true;

    const localeToSelect = resolveInitialCatalogLocale(catalogLocales, {
      preselectedLocale,
      savedLocale: localStorage.getItem(STORAGE_KEY),
      surveyLocale: surveyModel.locale,
    });

    changeLocale(localeToSelect);
  }, [surveyModel, catalogLocales, preselectedLocale, changeLocale]);

  const languageOptions = useMemo(
    () =>
      catalogLocales.map((localeCode) => ({
        value: localeCode,
        label: catalogLocaleDisplayName(localeCode),
      })),
    [catalogLocales],
  );

  const currentOption = useMemo(() => {
    return languageOptions.find((option) => option.value === currentLocale);
  }, [languageOptions, currentLocale]);

  return {
    currentLocale,
    currentOption,
    languageOptions,
    changeLocale,
    hasMultipleLocales: languageOptions.length > 1,
    isDefaultLocale: isDefaultCatalogLocale(currentLocale),
  };
}

/** Returns the catalog form of `candidate` when it is available; otherwise undefined. */
function pickAvailableCatalogLocale(
  candidate: string | null | undefined,
  catalogLocales: readonly string[],
): string | undefined {
  if (!candidate) {
    return undefined;
  }

  const catalogLocale = fromSurveyModelLocale(candidate);
  return catalogLocales.includes(catalogLocale) ? catalogLocale : undefined;
}

/**
 * Pure initial-locale resolver for the public form language picker.
 * Kept in the feature: selection policy is UX, not shared catalog vocabulary.
 */
function resolveInitialCatalogLocale(
  catalogLocales: string[],
  sources: {
    preselectedLocale?: string;
    savedLocale: string | null;
    surveyLocale: string;
  },
): string {
  const fromPreselected = pickAvailableCatalogLocale(
    sources.preselectedLocale,
    catalogLocales,
  );
  if (fromPreselected) {
    return fromPreselected;
  }

  if (sources.savedLocale) {
    return (
      pickAvailableCatalogLocale(sources.savedLocale, catalogLocales) ??
      getBrowserPreferredLocale(catalogLocales)
    );
  }

  if (sources.surveyLocale) {
    return (
      pickAvailableCatalogLocale(sources.surveyLocale, catalogLocales) ??
      getBrowserPreferredLocale(catalogLocales)
    );
  }

  return (
    pickAvailableCatalogLocale(DEFAULT_CATALOG_LOCALE, catalogLocales) ??
    getBrowserPreferredLocale(catalogLocales)
  );
}

function getBrowserPreferredLocale(catalogLocales: string[]): string {
  if (typeof window === "undefined" || catalogLocales.length === 0) {
    return DEFAULT_CATALOG_LOCALE;
  }

  const browserLanguages = navigator.languages || [navigator.language] || [];

  for (const browserLang of browserLanguages) {
    const catalog = fromSurveyModelLocale(browserLang);
    if (catalogLocales.includes(catalog)) {
      return catalog;
    }

    const languageCode = browserLang?.split("-")[0];
    if (languageCode) {
      const catalogLang = fromSurveyModelLocale(languageCode);
      if (catalogLocales.includes(catalogLang)) {
        return catalogLang;
      }
    }
  }

  return catalogLocales.includes(DEFAULT_CATALOG_LOCALE)
    ? DEFAULT_CATALOG_LOCALE
    : catalogLocales[0];
}
