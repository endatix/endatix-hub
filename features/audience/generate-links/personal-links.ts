import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { withBasePath } from "@/lib/hosting";
import { writeCsv } from "@/lib/utils/csv";

/** One person's link: their identifier and the one-time token the API returned. */
export type PersonalLink = { identifier: string; token: string };

export const LINKS_FILE_MIME = "text/csv";

/** What an API before link batches (endatix#1430) cannot do. */
export const FILTERED_LINKS_NEED_NEWER_API =
  "Sending links to a filtered set needs a newer Endatix API";

/** The public URL that opens this person's response; the token is its only credential. */
export function personalLinkUrl(
  origin: string,
  formId: string,
  token: string,
): string {
  const path = withBasePath(`/share/${formId}/a/${token}`);
  return `${origin}${path}`;
}

/** `personalized-links-<form>-2026-10-12.csv`: dated, so a second batch never overwrites the first. */
export function linksFileName(formId: string, at: Date = new Date()): string {
  return `personalized-links-${formId}-${at.toISOString().slice(0, 10)}.csv`;
}

type LinksFile = {
  origin: string;
  formId: string;
  identifierKind: AudienceIdentifierKind;
  links: readonly PersonalLink[];
};

/**
 * One row per person: the identifier under the match key's wire name (`email`, `external_id`),
 * then the link. The same header the import suggests from, so the file reads back in.
 */
export function linksCsv({ origin, formId, identifierKind, links }: LinksFile) {
  return writeCsv([
    [identifierKind, "link"],
    ...links.map((link) => [
      link.identifier,
      personalLinkUrl(origin, formId, link.token),
    ]),
  ]);
}
