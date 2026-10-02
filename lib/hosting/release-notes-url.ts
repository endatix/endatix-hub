const RELEASE_NOTES_BASE = {
  hub: "https://github.com/endatix/endatix-hub/releases/tag/",
  api: "https://github.com/endatix/endatix/releases/tag/",
} as const;

/** Stable, canary and hotfix tags: `0.8.0`, `0.8.1-canary.3`, `0.8.1-hotfix.1`. */
const RELEASE_TAG_VERSION = /^\d+\.\d+\.\d+(-(canary|hotfix)\.\d+)?$/;

export type ReleaseProduct = keyof typeof RELEASE_NOTES_BASE;

/** Where in the Hub the reader followed the link from; sent as `utm_medium`. */
export type ReleaseNotesSource = "about_dialog";

/**
 * GitHub release page for a committed product version. No GitHub API call:
 * the tag is `v` plus the version string already in the build.
 * Returns null unless the value is a version we tag: a blank row, a local or
 * PR build (`0.0.0-*`) and a build from source (`0.8.0-5-gabc1234`, `-dirty`,
 * a bare SHA, possibly a fork's commit) are shown, never linked.
 */
export function releaseNotesUrl(
  product: ReleaseProduct,
  version: string | null | undefined,
  source: ReleaseNotesSource,
): string | null {
  const trimmed = version?.trim();
  if (
    !trimmed ||
    !RELEASE_TAG_VERSION.test(trimmed) ||
    trimmed.startsWith("0.0.0")
  ) {
    return null;
  }

  const url = new URL(`${RELEASE_NOTES_BASE[product]}v${trimmed}`);
  url.searchParams.set("utm_source", "endatix_hub");
  url.searchParams.set("utm_medium", source);
  url.searchParams.set("utm_campaign", "release_notes");
  return url.toString();
}
