export {
  DEFAULT_CATALOG_LOCALE,
  catalogLocaleDisplayName,
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
  surveyJsDefaultLocaleCode,
  toCatalogLocales,
  toSurveyModelLocale,
} from "./catalog-locale";

export {
  isCatalogDefaultLocaleKey,
  isValidCultureCode,
  normalizeCultureCode,
  normalizeCultureCodes,
  normalizeOptionalCultureTag,
  resolveCatalogDefaultLabelText,
  tryNormalizeCultureCode,
} from "./culture-code";
export type { NormalizeCultureCodesResult } from "./culture-code";
