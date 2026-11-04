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
 * Locales use the owned catalog vocabulary (`default`, `bg`, …). The default
 * language is the survey's own JSON `locale` (captured when the model first
 * arrives), so SurveyJS `model.locale` is that code, or `""` when it has none.
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
  const initializedForModelRef = useRef<SurveyModel | null>(null);
  const surveyDefaultLocaleRef = useRef("");

  const applyCatalogLocale = useCallback(
    (newLocale: string, persist: boolean) => {
      const surveyDefaultLocale = surveyDefaultLocaleRef.current;
      const catalogLocale = fromSurveyModelLocale(
        newLocale,
        surveyDefaultLocale,
      );
      if (!surveyModel || !catalogLocales.includes(catalogLocale)) {
        return;
      }

      setCurrentLocale(catalogLocale);
      surveyModel.locale = toSurveyModelLocale(
        catalogLocale,
        surveyDefaultLocale,
      );
      if (persist) {
        localStorage.setItem(STORAGE_KEY, catalogLocale);
      }
    },
    [surveyModel, catalogLocales],
  );

  const changeLocale = useCallback(
    (newLocale: string) => {
      applyCatalogLocale(newLocale, true);
    },
    [applyCatalogLocale],
  );

  useEffect(() => {
    if (!surveyModel || catalogLocales.length === 0) {
      return;
    }

    if (initializedForModelRef.current === surveyModel) {
      return;
    }
    initializedForModelRef.current = surveyModel;
    surveyDefaultLocaleRef.current = surveyDefaultLocaleOf(
      surveyModel.locale,
      catalogLocales,
    );

    const localeToSelect = resolveInitialCatalogLocale(catalogLocales, {
      preselectedLocale,
      savedLocale: localStorage.getItem(STORAGE_KEY),
      surveyLocale: surveyModel.locale,
      surveyDefaultLocale: surveyDefaultLocaleRef.current,
    });

    applyCatalogLocale(localeToSelect, false);
  }, [surveyModel, catalogLocales, preselectedLocale, applyCatalogLocale]);

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

/**
 * The language the survey's default strings are written in: its JSON `locale`,
 * unless that locale has its own translations in the catalog.
 */
function surveyDefaultLocaleOf(
  surveyLocale: string,
  catalogLocales: readonly string[],
): string {
  return catalogLocales.includes(fromSurveyModelLocale(surveyLocale))
    ? ""
    : surveyLocale;
}

/** Returns the catalog form of `candidate` when it is available; otherwise undefined. */
function pickAvailableCatalogLocale(
  candidate: string | null | undefined,
  catalogLocales: readonly string[],
  surveyDefaultLocale: string,
): string | undefined {
  if (candidate == null) {
    return undefined;
  }

  const catalogLocale = fromSurveyModelLocale(candidate, surveyDefaultLocale);
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
    surveyDefaultLocale: string;
  },
): string {
  const { surveyDefaultLocale } = sources;
  const pick = (candidate: string | null | undefined) =>
    pickAvailableCatalogLocale(candidate, catalogLocales, surveyDefaultLocale);
  const browserPreferred = () =>
    getBrowserPreferredLocale(catalogLocales, surveyDefaultLocale);

  const fromPreselected = pick(sources.preselectedLocale);
  if (fromPreselected) {
    return fromPreselected;
  }

  if (sources.savedLocale) {
    return pick(sources.savedLocale) ?? browserPreferred();
  }

  if (sources.surveyLocale) {
    return (
      pickAvailableCatalogLocale(sources.surveyLocale, catalogLocales, "") ??
      browserPreferred()
    );
  }

  return pick(DEFAULT_CATALOG_LOCALE) ?? browserPreferred();
}

function getBrowserPreferredLocale(
  catalogLocales: string[],
  surveyDefaultLocale: string,
): string {
  if (typeof window === "undefined" || catalogLocales.length === 0) {
    return DEFAULT_CATALOG_LOCALE;
  }

  const browserLanguages = (navigator.languages ?? [navigator.language]).filter(
    (tag): tag is string => Boolean(tag),
  );

  for (const browserLang of browserLanguages) {
    const catalog = fromSurveyModelLocale(browserLang, surveyDefaultLocale);
    if (catalogLocales.includes(catalog)) {
      return catalog;
    }

    const languageCode = browserLang.split("-")[0];
    if (languageCode) {
      const catalogLang = fromSurveyModelLocale(
        languageCode,
        surveyDefaultLocale,
      );
      if (catalogLocales.includes(catalogLang)) {
        return catalogLang;
      }
    }
  }

  return catalogLocales.includes(DEFAULT_CATALOG_LOCALE)
    ? DEFAULT_CATALOG_LOCALE
    : catalogLocales[0];
}
