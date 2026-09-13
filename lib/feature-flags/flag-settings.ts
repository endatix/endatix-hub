/**
 * Vocabulary for how Hub flags are configured. Deliberately dependency-free: the flag
 * factories, the server loader, and the admin client component all describe the same
 * thing, and each re-spelling of this union is a place they can drift apart.
 */

export type FlagProviderName = "posthog" | "environment";

export type FlagSettings = {
  /**
   * The provider Hub flags resolve through. Once a flag has been evaluated this is the
   * frozen choice, so it never contradicts the running flags; before that it is what the
   * next evaluation will pick from the current environment.
   */
  readonly provider: FlagProviderName;
};
