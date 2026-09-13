/**
 * Vocabulary for how Hub flags are configured. Deliberately dependency-free: the flag
 * factories, the server loader, and the admin client component all describe the same
 * thing, and each re-spelling of this union is a place they can drift apart.
 */

export type FlagProviderName = "posthog" | "environment";

export type FlagSettings = {
  /** Raw `FLAG_PROVIDER`, trimmed. Empty when unset. */
  readonly requestedProvider: string;
  /**
   * The provider the flags actually run on; `null` until the first evaluation in this
   * process. It can disagree with `requestedProvider` once env changes after the freeze —
   * surfacing that disagreement is the reason both fields exist.
   */
  readonly provider: FlagProviderName | null;
};
