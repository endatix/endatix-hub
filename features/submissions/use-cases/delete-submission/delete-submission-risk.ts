export type DeleteSubmissionKind = "test" | "owned" | "respondent";

export type DeleteSubmissionRiskTier = "low" | "elevated";

function normalizeId(value?: string | null): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Hub "owned" means the current session user is the submitter identity shown in Hub.
 * Prefer `submitterDisplayId` (grid "Submitter ID" column); also accept `submitterId`
 * for legacy rows where the Hub user id was stored as the submitter PK.
 */
export function isOwnedByCurrentUser(args: {
  submitterId?: string | null;
  submitterDisplayId?: string | null;
  currentUserId?: string | null;
}): boolean {
  const currentUserId = normalizeId(args.currentUserId);
  if (!currentUserId) {
    return false;
  }

  const submitterDisplayId = normalizeId(args.submitterDisplayId);
  if (submitterDisplayId && submitterDisplayId === currentUserId) {
    return true;
  }

  const submitterId = normalizeId(args.submitterId);
  return Boolean(submitterId && submitterId === currentUserId);
}

export function resolveDeleteSubmissionKind(args: {
  isTestSubmission?: boolean;
  submitterId?: string | null;
  submitterDisplayId?: string | null;
  currentUserId?: string | null;
}): DeleteSubmissionKind {
  if (args.isTestSubmission) {
    return "test";
  }

  if (isOwnedByCurrentUser(args)) {
    return "owned";
  }

  return "respondent";
}

export function resolveDeleteSubmissionRisk(args: {
  isTestSubmission?: boolean;
  submitterId?: string | null;
  submitterDisplayId?: string | null;
  currentUserId?: string | null;
}): DeleteSubmissionRiskTier {
  return resolveDeleteSubmissionKind(args) === "respondent"
    ? "elevated"
    : "low";
}
