/**
 * What a running build is. A release has `version` (the tag without `v`) and
 * links to its notes. Any other build has no version and is identified by the
 * branch and commit it was built from — for developers, never linked.
 */
export type BuildIdentity = {
  readonly version: string | null;
  readonly branch: string | null;
  readonly commit: string | null;
};

/** Plain text for support: `0.8.0`, or `main @ <full sha>`. */
export function formatBuildIdentity(build: BuildIdentity | null): string {
  if (build?.version) {
    return build.version;
  }

  if (!build?.branch && !build?.commit) {
    return "unavailable";
  }

  return [
    build.branch ?? "unknown branch",
    build.commit ?? "unknown commit",
  ].join(" @ ");
}

export function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
