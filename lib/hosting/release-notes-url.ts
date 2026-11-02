import {
  SURVEYJS_RELEASE_REPOS,
  type SurveyJsPackage,
} from "./surveyjs-packages.mjs";

const ENDATIX_RELEASE_NOTES_BASE = {
  hub: "https://github.com/endatix/endatix-hub/releases/tag/",
  api: "https://github.com/endatix/endatix/releases/tag/",
} as const;

/** Stable, canary and hotfix tags: `0.8.0`, `0.8.1-canary.3`, `0.8.1-hotfix.1`. */
const RELEASE_TAG_VERSION = /^\d+\.\d+\.\d+(-(canary|hotfix)\.\d+)?$/;

/** SurveyJS tags every published version, pre-releases included: `3.2.3`, `3.3.0-beta.1`. */
const SURVEYJS_TAG_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/;

type EndatixProduct = keyof typeof ENDATIX_RELEASE_NOTES_BASE;

export type ReleaseProduct = EndatixProduct | SurveyJsPackage;

/** Where in the Hub the reader followed the link from; sent as `utm_medium`. */
export type ReleaseNotesSource = "about_dialog";

/**
 * GitHub release page for a version already in the build. No GitHub API call:
 * the tag is `v` plus the version string.
 * Returns null unless the value is a version its project tags. For Endatix, a
 * blank row, a local or PR build (`0.0.0-*`) and a build from source
 * (`0.8.0-5-gabc1234`, `-dirty`, a bare SHA, possibly a fork's commit) are
 * shown, never linked. SurveyJS links carry no Endatix tracking parameters.
 */
export function releaseNotesUrl(
  product: ReleaseProduct,
  version: string | null | undefined,
  source: ReleaseNotesSource,
): string | null {
  const trimmed = version?.trim();
  if (!trimmed) {
    return null;
  }

  return isEndatixProduct(product)
    ? endatixReleaseNotesUrl(product, trimmed, source)
    : surveyJsReleaseNotesUrl(product, trimmed);
}

function isEndatixProduct(product: ReleaseProduct): product is EndatixProduct {
  return Object.hasOwn(ENDATIX_RELEASE_NOTES_BASE, product);
}

function endatixReleaseNotesUrl(
  product: EndatixProduct,
  version: string,
  source: ReleaseNotesSource,
): string | null {
  if (!RELEASE_TAG_VERSION.test(version) || version.startsWith("0.0.0")) {
    return null;
  }

  const url = new URL(`${ENDATIX_RELEASE_NOTES_BASE[product]}v${version}`);
  url.searchParams.set("utm_source", "endatix_hub");
  url.searchParams.set("utm_medium", source);
  url.searchParams.set("utm_campaign", "release_notes");
  return url.toString();
}

function surveyJsReleaseNotesUrl(
  product: SurveyJsPackage,
  version: string,
): string | null {
  if (!SURVEYJS_TAG_VERSION.test(version)) {
    return null;
  }

  const repo = SURVEYJS_RELEASE_REPOS[product];
  return `https://github.com/surveyjs/${repo}/releases/tag/v${version}`;
}
