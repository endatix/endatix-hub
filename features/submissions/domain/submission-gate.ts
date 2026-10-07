import {
  collectionDisposition,
  SCREEN_OUT_STATUS,
  type CollectionDisposition,
} from "./collection-status";

/** What the respondent may do with the loaded submission. */
export type SubmissionGatePhase = "resume" | "completed" | "closed" | "blocked";

export interface ResolveSubmissionGateInput {
  canStartNewSubmission: boolean;
  hasUserSubmitted: boolean;
  hasUrlToken: boolean;
  /** False when no submission is loaded. An absent status is not a draft. */
  hasSubmission: boolean;
  collectionStatus?: string;
  isComplete: boolean;
}

const PHASE_BY_DISPOSITION: Record<CollectionDisposition, SubmissionGatePhase> =
  {
    open: "resume",
    complete: "completed",
    closed: "closed",
  };

/**
 * One decision for share, embed, and any later caller.
 * Without a URL token, one-per-user blocks a new start once there is no open
 * draft. Otherwise only an open interview resumes. A screen-out shows the
 * normal completed page, so the respondent is not told they were screened out.
 */
export function resolveSubmissionGate(
  input: ResolveSubmissionGateInput,
): SubmissionGatePhase {
  const disposition = collectionDisposition(
    input.collectionStatus,
    input.isComplete,
  );

  if (isBlockedRevisit(input, disposition)) {
    return "blocked";
  }

  if (input.collectionStatus === SCREEN_OUT_STATUS) {
    return "completed";
  }

  return PHASE_BY_DISPOSITION[disposition];
}

function isBlockedRevisit(
  input: ResolveSubmissionGateInput,
  disposition: CollectionDisposition,
): boolean {
  const hasOpenDraft = input.hasSubmission && disposition === "open";
  return (
    !input.hasUrlToken &&
    input.hasUserSubmitted &&
    !input.canStartNewSubmission &&
    !hasOpenDraft
  );
}
