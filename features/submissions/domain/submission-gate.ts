import { collectionDisposition } from "./collection-status";

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

/**
 * One decision for share, embed, and any later caller.
 * A URL token resumes only an open interview. A finished code on that token
 * stays on this submission. Without a token, one-per-user blocks a new start
 * once there is no open draft.
 */
export function resolveSubmissionGate({
  canStartNewSubmission,
  hasUserSubmitted,
  hasUrlToken,
  hasSubmission,
  collectionStatus,
  isComplete,
}: ResolveSubmissionGateInput): SubmissionGatePhase {
  const disposition = collectionDisposition(collectionStatus, isComplete);

  if (hasUrlToken) {
    if (disposition === "complete") {
      return "completed";
    }
    if (disposition === "closed") {
      return "closed";
    }
    return "resume";
  }

  const hasOpenDraft = hasSubmission && disposition === "open";
  if (hasUserSubmitted && !canStartNewSubmission && !hasOpenDraft) {
    return "blocked";
  }

  if (disposition === "complete") {
    return "completed";
  }
  if (disposition === "closed") {
    return "closed";
  }

  return "resume";
}
