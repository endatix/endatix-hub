export {
  DEFAULT_CATALOG_LOCALE,
  catalogLocaleCodeLabel,
  catalogLocaleDisplayName,
  catalogLocaleEnglishName,
  fromSurveyModelLocale,
  isCatalogDefaultLocaleKey,
  isDefaultCatalogLocale,
  isValidCultureCode,
  normalizeCultureCode,
  normalizeCultureCodes,
  normalizeOptionalCultureTag,
  resolveCatalogDefaultLabelText,
  surveyDefaultLocale,
  surveyJsDefaultLocaleCode,
  surveyJsonLocale,
  surveyModelLocale,
  toCatalogLocaleKey,
  toCatalogLocales,
  toSurveyModelLocale,
  tryNormalizeCultureCode,
} from "./catalog";
export type { NormalizeCultureCodesResult } from "./catalog";

export { getSubmissionLocale, isLocaleValid } from "./submission-locale";
