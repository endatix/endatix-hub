/**
 * Deprecated `NEXT_PUBLIC_*` names, normalised into their `ENDATIX_*` equivalents once at
 * server startup so an existing self-hosted `.env` keeps working across the rename.
 *
 * SERVER ONLY — and the file name is the contract. Next's DefinePlugin inlines any
 * `NEXT_PUBLIC_`-prefixed env literal it finds in a module reachable from a client
 * component, which is exactly the build-time baking this feature exists to remove. Keeping
 * these reads in a module that no client component imports is what makes them a runtime
 * lookup. `no-build-time-client-config.test.ts` enforces both halves.
 *
 * Normalising at boot rather than merging at read time is deliberate: every consumer then
 * reads one name from one place, so there is no current-versus-legacy precedence to get
 * wrong, and server-rendered client components see the same values the browser will.
 *
 * Delete this file once the deprecation window closes.
 */

/** Current name -> the deprecated name it supersedes. */
const RENAMES: ReadonlyArray<readonly [string, string]> = [
  ["ENDATIX_SURVEY_LICENSE_KEY", "NEXT_PUBLIC_SLK"],
  ["ENDATIX_RECAPTCHA_SITE_KEY", "NEXT_PUBLIC_RECAPTCHA_SITE_KEY"],
  ["ENDATIX_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_KEY"],
  ["ENDATIX_POSTHOG_HOST", "NEXT_PUBLIC_POSTHOG_HOST"],
  ["ENDATIX_POSTHOG_UI_HOST", "NEXT_PUBLIC_POSTHOG_UI_HOST"],
  ["ENDATIX_IS_DEBUG_MODE", "NEXT_PUBLIC_IS_DEBUG_MODE"],
  [
    "ENDATIX_SUBMITTER_PRIMARY_FILTER_LABEL",
    "NEXT_PUBLIC_SUBMITTER_PRIMARY_FILTER_LABEL",
  ],
  [
    "ENDATIX_SUBMITTER_GRID_PROFILE_FIELDS",
    "NEXT_PUBLIC_SUBMITTER_GRID_PROFILE_FIELDS",
  ],
];

/**
 * Fills any unset `ENDATIX_*` name from its deprecated counterpart. Idempotent, and the
 * current name always wins — a blank or whitespace-only value counts as unset on both
 * sides, matching how `readPublicEndatixEnv()` normalises.
 *
 * @returns the names that were filled from a deprecated variable, for logging.
 */
export function applyLegacyPublicEnv(): string[] {
  const applied: string[] = [];

  for (const [current, deprecated] of RENAMES) {
    if (process.env[current]?.trim()) {
      continue;
    }
    const legacyValue = process.env[deprecated]?.trim();
    if (legacyValue) {
      process.env[current] = legacyValue;
      applied.push(`${deprecated} -> ${current}`);
    }
  }

  return applied;
}
