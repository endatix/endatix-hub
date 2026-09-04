import {
  DEFAULT_CREATOR_TAB,
  ENDATIX_CREATOR_TAB,
  type EndatixCreatorTabId,
} from "./tabs";

export const CREATOR_TAB_QUERY_KEY = "tab";

/** The one canonical `?tab=` slug per Creator tab id; the reverse map is derived. */
const SLUG_BY_TAB_ID: Record<EndatixCreatorTabId, string> = {
  [ENDATIX_CREATOR_TAB.designer]: "design",
  [ENDATIX_CREATOR_TAB.preview]: "preview",
  [ENDATIX_CREATOR_TAB.theme]: "theme",
  [ENDATIX_CREATOR_TAB.translation]: "translation",
  [ENDATIX_CREATOR_TAB.json]: "json",
  [ENDATIX_CREATOR_TAB.logic]: "logic",
  [ENDATIX_CREATOR_TAB.diagnostics]: "diagnostics",
};

const TAB_ID_BY_SLUG = new Map<string, EndatixCreatorTabId>(
  Object.entries(SLUG_BY_TAB_ID).map(([tabId, slug]) => [
    slug,
    tabId as EndatixCreatorTabId,
  ]),
);

/** Tolerated on the way in only: raw Creator ids and older spellings. */
const SLUG_ALIASES: Record<string, EndatixCreatorTabId> = {
  designer: ENDATIX_CREATOR_TAB.designer,
  test: ENDATIX_CREATOR_TAB.preview,
  themes: ENDATIX_CREATOR_TAB.theme,
  jsoneditor: ENDATIX_CREATOR_TAB.json,
  "json-editor": ENDATIX_CREATOR_TAB.json,
  editor: ENDATIX_CREATOR_TAB.json,
  "form-diagnostics": ENDATIX_CREATOR_TAB.diagnostics,
};

export function parseCreatorTabUrlSlug(
  queryValue: string | null | undefined,
): EndatixCreatorTabId {
  const slug = queryValue?.trim().toLowerCase();
  if (!slug) {
    return DEFAULT_CREATOR_TAB;
  }

  return TAB_ID_BY_SLUG.get(slug) ?? SLUG_ALIASES[slug] ?? DEFAULT_CREATOR_TAB;
}

/** `null` omits `tab` — Design is the default and is never written to the URL. */
export function serializeCreatorTabUrlSlug(
  tabId: EndatixCreatorTabId,
): string | null {
  return tabId === DEFAULT_CREATOR_TAB ? null : SLUG_BY_TAB_ID[tabId];
}
