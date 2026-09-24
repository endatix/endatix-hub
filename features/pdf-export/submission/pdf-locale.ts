import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  toCatalogLocales,
} from "@/lib/localization/catalog";
import { parseBoolean } from "@/lib/utils/type-parsers";

/** `?locale=<catalog code>`: the label language chosen on the submission page. */
export const PDF_LOCALE_PARAM = "locale";
/** Legacy `?defaultLocale=true` links; wins over `locale`. */
const PDF_DEFAULT_LOCALE_PARAM = "defaultLocale";

export type PdfLocaleQuery = {
  requestedLocale?: string;
  forceDefault?: boolean;
};

export type PdfLocaleDecision = {
  catalogLocale: string;
  source: "explicit" | "submission" | "default";
};

export function parsePdfLocaleQuery(
  searchParams: URLSearchParams,
): PdfLocaleQuery {
  return {
    requestedLocale: searchParams.get(PDF_LOCALE_PARAM) ?? undefined,
    forceDefault: parseBoolean(searchParams.get(PDF_DEFAULT_LOCALE_PARAM)),
  };
}

/**
 * Picks the catalog locale for a submission PDF: explicit `locale`, else the
 * submitted language, else the survey default. A code the survey does not
 * have falls back to the default so a stale link still downloads.
 */
export function resolvePdfLocale(
  usedLocales: readonly string[],
  submissionLocale: string | undefined,
  { requestedLocale, forceDefault }: PdfLocaleQuery = {},
): PdfLocaleDecision {
  const fallback: PdfLocaleDecision = {
    catalogLocale: DEFAULT_CATALOG_LOCALE,
    source: "default",
  };
  if (forceDefault) {
    return fallback;
  }

  const allowed = new Set(toCatalogLocales(usedLocales));
  const pick = (code: string, source: PdfLocaleDecision["source"]) => {
    const catalogLocale = fromSurveyModelLocale(code);
    return allowed.has(catalogLocale) ? { catalogLocale, source } : fallback;
  };

  const requested = requestedLocale?.trim();
  if (requested) {
    return pick(requested, "explicit");
  }
  return submissionLocale ? pick(submissionLocale, "submission") : fallback;
}
