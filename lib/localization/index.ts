export {
  DEFAULT_CATALOG_LOCALE,
  catalogLocaleDisplayName,
  fromSurveyModelLocale,
  isCatalogDefaultLocaleKey,
  isDefaultCatalogLocale,
  isValidCultureCode,
  normalizeCultureCode,
  normalizeCultureCodes,
  normalizeOptionalCultureTag,
  resolveCatalogDefaultLabelText,
  surveyJsDefaultLocaleCode,
  toCatalogLocaleKey,
  toCatalogLocales,
  toSurveyModelLocale,
  tryNormalizeCultureCode,
} from "./catalog";
export type { NormalizeCultureCodesResult } from "./catalog";

export {
  getLanguageDisplayName,
  getSubmissionLocale,
  isLocaleValid,
  resolveSurveyModelLocaleForSubmission,
} from "./submission-locale";
