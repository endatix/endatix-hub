import type { StatusTone } from "@/components/common/status-badge";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";

export interface SignupStatePresentation {
  tone: StatusTone;
  label: string;
}

/** What the reviewer can still do with a request. */
export type SignupRequestNextStep = "decide" | "retry" | null;

export interface SignupRequestState {
  /** The one badge a list row shows: the decision, or the provisioning problem behind it. */
  row: SignupStatePresentation;
  decision: SignupStatePresentation;
  /** Only for approved requests; provisioning does not exist before a decision. */
  provisioning: SignupStatePresentation | null;
  nextStep: SignupRequestNextStep;
}

const DECISION: Record<string, SignupStatePresentation> = {
  pending: { tone: "attention", label: "Pending" },
  approved: { tone: "on", label: "Approved" },
  // Declining is a legitimate outcome, not a failure.
  rejected: { tone: "off", label: "Rejected" },
};

const PROVISIONING: Record<string, SignupStatePresentation> = {
  pending: { tone: "off", label: "In progress" },
  succeeded: { tone: "on", label: "Ready" },
  failed: { tone: "attention", label: "Failed" },
};

export function describeSignupRequest(
  request: Pick<SignupRequestListItem, "status" | "provisioningStatus">,
): SignupRequestState {
  const decision = DECISION[request.status] ?? {
    tone: "off",
    label: request.status,
  };

  if (request.status !== "approved") {
    return {
      row: decision,
      decision,
      provisioning: null,
      nextStep: request.status === "pending" ? "decide" : null,
    };
  }

  const provisioning = PROVISIONING[request.provisioningStatus] ?? {
    tone: "off",
    label: request.provisioningStatus,
  };

  if (request.provisioningStatus === "failed") {
    return {
      row: { tone: "attention", label: "Setup failed" },
      decision,
      provisioning,
      nextStep: "retry",
    };
  }

  if (request.provisioningStatus === "pending") {
    return {
      row: { tone: "off", label: "Setting up" },
      decision,
      provisioning,
      nextStep: null,
    };
  }

  return { row: decision, decision, provisioning, nextStep: null };
}

/** A workspace name to start from: the company, or the email's local part. */
export function suggestWorkspaceName(
  request: Pick<SignupRequestListItem, "companyName" | "email">,
): string {
  return request.companyName?.trim() || request.email.split("@")[0] || "";
}
