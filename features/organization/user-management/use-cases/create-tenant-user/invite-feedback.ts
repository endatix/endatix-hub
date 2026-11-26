import type { ApiError, ApiResult } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";

type SetupEligibility = () => Promise<boolean>;

export async function inviteFeedback({ error }: ApiError, canResumeSetup: SetupEligibility) {
  const details = error.details;
  if (details?.requiredAction) return { kind: "standing", refusal: details.requiredAction } as const;
  if (details?.statusCode === 409 && error.errorCode === "invite_declined") {
    return await canResumeSetup() ? { kind: "setup" } as const : { kind: "declined" } as const;
  }
  if (details?.statusCode === 503) return { kind: "unavailable" } as const;
  return undefined;
}

export async function inviteFailure(response: ApiResult<unknown>, canResumeSetup: SetupEligibility) {
  const feedback = response.success ? undefined : await inviteFeedback(response, canResumeSetup);
  const result = toResult(response, {
    fallbackMessage: "Could not send the invitation.",
    logMessage: feedback?.kind === "declined" || feedback?.kind === "setup" ? undefined : "Invite request failed",
    loggerName: "organization.user-management",
  });
  if (Result.isSuccess(result)) return null;
  return {
    isSuccess: false as const,
    formErrors: [result.message],
    errors: response.success ? undefined : response.error.fields,
    feedback,
  };
}
