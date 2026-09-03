import {
  DEFAULT_CREATOR_TAB,
  ENDATIX_CREATOR_TAB,
  type EndatixCreatorTabId,
} from "./tabs";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "./built-in-tabs";

export const CREATOR_TAB_QUERY_KEY = "tab";

export const CREATOR_TAB_URL_SLUG = {
  design: "design",
  preview: "preview",
  theme: "theme",
  translation: "translation",
  json: "json",
  logic: "logic",
  diagnostics: "diagnostics",
} as const;

export type CreatorTabUrlSlug =
  (typeof CREATOR_TAB_URL_SLUG)[keyof typeof CREATOR_TAB_URL_SLUG];

const SLUG_TO_TAB_ID: Record<CreatorTabUrlSlug, EndatixCreatorTabId> = {
  [CREATOR_TAB_URL_SLUG.design]: SURVEY_CREATOR_BUILT_IN_TAB.designer,
  [CREATOR_TAB_URL_SLUG.preview]: SURVEY_CREATOR_BUILT_IN_TAB.preview,
  [CREATOR_TAB_URL_SLUG.theme]: SURVEY_CREATOR_BUILT_IN_TAB.theme,
  [CREATOR_TAB_URL_SLUG.translation]: SURVEY_CREATOR_BUILT_IN_TAB.translation,
  [CREATOR_TAB_URL_SLUG.json]: SURVEY_CREATOR_BUILT_IN_TAB.json,
  [CREATOR_TAB_URL_SLUG.logic]: SURVEY_CREATOR_BUILT_IN_TAB.logic,
  [CREATOR_TAB_URL_SLUG.diagnostics]: ENDATIX_CREATOR_TAB.diagnostics,
};

const TAB_ID_TO_SLUG: Record<EndatixCreatorTabId, CreatorTabUrlSlug> = {
  [SURVEY_CREATOR_BUILT_IN_TAB.designer]: CREATOR_TAB_URL_SLUG.design,
  [SURVEY_CREATOR_BUILT_IN_TAB.preview]: CREATOR_TAB_URL_SLUG.preview,
  [SURVEY_CREATOR_BUILT_IN_TAB.theme]: CREATOR_TAB_URL_SLUG.theme,
  [SURVEY_CREATOR_BUILT_IN_TAB.translation]: CREATOR_TAB_URL_SLUG.translation,
  [SURVEY_CREATOR_BUILT_IN_TAB.json]: CREATOR_TAB_URL_SLUG.json,
  [SURVEY_CREATOR_BUILT_IN_TAB.logic]: CREATOR_TAB_URL_SLUG.logic,
  [ENDATIX_CREATOR_TAB.diagnostics]: CREATOR_TAB_URL_SLUG.diagnostics,
};

const CANONICAL_SLUGS = new Set<string>(Object.values(CREATOR_TAB_URL_SLUG));

const SLUG_ALIASES: Record<string, CreatorTabUrlSlug> = {
  designer: CREATOR_TAB_URL_SLUG.design,
  test: CREATOR_TAB_URL_SLUG.preview,
  themes: CREATOR_TAB_URL_SLUG.theme,
  jsoneditor: CREATOR_TAB_URL_SLUG.json,
  "json-editor": CREATOR_TAB_URL_SLUG.json,
  editor: CREATOR_TAB_URL_SLUG.json,
  "form-diagnostics": CREATOR_TAB_URL_SLUG.diagnostics,
};

function slugFromQuery(normalized: string): CreatorTabUrlSlug | undefined {
  if (CANONICAL_SLUGS.has(normalized)) {
    return normalized as CreatorTabUrlSlug;
  }
  return SLUG_ALIASES[normalized];
}

export function parseCreatorTabUrlSlug(
  queryValue: string | null | undefined,
): EndatixCreatorTabId {
  const normalized = queryValue?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_CREATOR_TAB;
  }

  const slug = slugFromQuery(normalized);
  return slug ? SLUG_TO_TAB_ID[slug] : DEFAULT_CREATOR_TAB;
}

/** `null` omits `tab` (Design). */
export function serializeCreatorTabUrlSlug(
  tabId: EndatixCreatorTabId,
): CreatorTabUrlSlug | null {
  if (tabId === DEFAULT_CREATOR_TAB) {
    return null;
  }

  return TAB_ID_TO_SLUG[tabId];
}
