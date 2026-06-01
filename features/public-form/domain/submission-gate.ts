/**
 * The phase of the submission gate.
 * @param active - The user is active - they can submit the form.
 * @param blocked - The user is blocked - they cannot submit the form.
 */
export type SubmissionGatePhase = "active" | "blocked";

/**
 * The input for resolving the submission gate.
 * @param hasUserSubmitted - Whether the user has submitted the form.
 * @param hasResumableDraft - Whether the user has a resumable draft.
 * @param hasUrlToken - Whether the user has a URL token.
 */
export interface ResolveSubmissionGateInput {
  hasUserSubmitted: boolean;
  hasResumableDraft: boolean;
  hasUrlToken: boolean;
}

/**
 * Resolves the submission gate based on the input.
 * @param input - The input.
 * @returns The submission gate phase.
 */
export function resolveSubmissionGate({
  hasUserSubmitted,
  hasResumableDraft,
  hasUrlToken,
}: ResolveSubmissionGateInput): SubmissionGatePhase {
  if (hasUrlToken) {
    return "active";
  }

  if (hasUserSubmitted && !hasResumableDraft) {
    return "blocked";
  }

  return "active";
}
