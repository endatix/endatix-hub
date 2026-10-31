import { writeCsv } from "@/lib/utils/csv";
import { testLinkPath } from "../shared/test-link-path";

/** One run's link: whose it is, which run, and the token that opens its test submission. */
export type TestLinkRow = {
  identifier: string;
  run: number;
  token: string;
  expiresAt: string;
};

export const TEST_LINKS_FILE_MIME = "text/csv";

/** `test-links-<form>-2026-10-30.csv`: dated, like the personalized links file. */
export function testLinksFileName(formId: string, at: Date = new Date()) {
  return `test-links-${formId}-${at.toISOString().slice(0, 10)}.csv`;
}

type TestLinksFile = {
  origin: string;
  formId: string;
  links: readonly TestLinkRow[];
};

/** One row per run: identifier, run, then the absolute link. */
export function testLinksCsv({ origin, formId, links }: TestLinksFile) {
  return writeCsv([
    ["identifier", "run", "link"],
    ...links.map((link) => [
      link.identifier,
      String(link.run),
      `${origin}${testLinkPath(formId, link.token)}`,
    ]),
  ]);
}
