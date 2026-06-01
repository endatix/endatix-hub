/**
 * The phase of the submission gate.
 * @param active - The user is active - they can submit the form.
 * @param blocked - The user is blocked - they cannot submit the form.
 */
export type SubmissionGatePhase = "active" | "blocked";

/**
 * The input for resolving the submission gate.
 * @param canStartNewSubmission - Whether the backend allows starting a new submission.
 * @param hasResumableDraft - Whether the user has a resumable draft.
 * @param hasUrlToken - Whether the user has a URL token.
 */
export interface ResolveSubmissionGateInput {
  canStartNewSubmission: boolean;
  hasResumableDraft: boolean;
  hasUrlToken: boolean;
}

/**
 * Resolves the submission gate based on the input.
 * @param input - The input.
 * @returns The submission gate phase.
 */
export function resolveSubmissionGate({
  canStartNewSubmission,
  hasResumableDraft,
  hasUrlToken,
}: ResolveSubmissionGateInput): SubmissionGatePhase {
  if (hasUrlToken) {
    return "active";
  }

  if (!canStartNewSubmission && !hasResumableDraft) {
    return "blocked";
  }

  return "active";
}
