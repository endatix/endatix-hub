import type { ApiError, ApiResult } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";

export function inviteFeedback({ error }: ApiError) {
  const details = error.details;
  if (details?.requiredAction) return { kind: "standing", refusal: details.requiredAction } as const;
  if (details?.statusCode === 409 && error.errorCode === "invite_declined") return { kind: "declined" } as const;
  if (details?.statusCode === 503) return { kind: "unavailable" } as const;
  return undefined;
}

export function inviteFailure(response: ApiResult<unknown>) {
  const feedback = response.success ? undefined : inviteFeedback(response);
  const result = toResult(response, {
    fallbackMessage: "Could not send the invitation.",
    logMessage: feedback?.kind === "declined" ? undefined : "Invite request failed",
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
