export {
  DEFAULT_CATALOG_LOCALE,
  catalogLocaleCodeLabel,
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
  resolvePdfCatalogLocale,
  resolveSurveyModelLocaleForSubmission,
} from "./submission-locale";
export type {
  PdfCatalogLocaleDecision,
  PdfLocaleSource,
} from "./submission-locale";
