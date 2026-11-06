export {
  DEFAULT_CATALOG_LOCALE,
  catalogLocaleCodeLabel,
  catalogLocaleDisplayName,
  catalogLocaleEnglishName,
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
  surveyDefaultLocale,
  surveyJsDefaultLocaleCode,
  surveyJsonLocale,
  surveyModelLocale,
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
  toCatalogLocaleKey,
  tryNormalizeCultureCode,
} from "./culture-code";
export type { NormalizeCultureCodesResult } from "./culture-code";
