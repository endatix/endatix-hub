import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  toCatalogLocales,
} from "@/lib/localization/catalog";

export type PdfLocaleSource = "explicit" | "submission" | "default";

export type PdfCatalogLocaleDecision = {
  catalogLocale: string;
  source: PdfLocaleSource;
};

/**
 * Picks the catalog locale for a submission PDF.
 * Unknown codes fall back to the survey default so a stale link still downloads.
 * `forceDefault` keeps links that already send `defaultLocale=true`.
 */
export function resolvePdfCatalogLocale(input: {
  usedLocales: readonly string[];
  submissionLocale?: string;
  requestedLocale?: string | null;
  forceDefault?: boolean;
}): PdfCatalogLocaleDecision {
  const allowed = new Set(toCatalogLocales(input.usedLocales));
  if (allowed.size === 0) {
    allowed.add(DEFAULT_CATALOG_LOCALE);
  }

  if (input.forceDefault) {
    return { catalogLocale: DEFAULT_CATALOG_LOCALE, source: "default" };
  }

  const requested = input.requestedLocale?.trim();
  if (requested) {
    const catalogLocale = fromSurveyModelLocale(requested);
    if (allowed.has(catalogLocale)) {
      return { catalogLocale, source: "explicit" };
    }
    return { catalogLocale: DEFAULT_CATALOG_LOCALE, source: "default" };
  }

  if (input.submissionLocale) {
    const catalogLocale = fromSurveyModelLocale(input.submissionLocale);
    if (allowed.has(catalogLocale)) {
      return { catalogLocale, source: "submission" };
    }
  }

  return { catalogLocale: DEFAULT_CATALOG_LOCALE, source: "default" };
}
