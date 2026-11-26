import { type ApiResult } from "@/lib/endatix-api";
import { Result, toResult, type Error as ResultError } from "@/lib/result";

export function inviteFeedback(error: ResultError) {
  if (error.requiredAction) return { kind: "standing", refusal: error.requiredAction } as const;
  if (error.statusCode === 409 && error.errorCode === "invite_declined") return { kind: "declined" } as const;
  if (error.statusCode === 503) return { kind: "unavailable" } as const;
  return undefined;
}

export function inviteFailure(response: ApiResult<unknown>) {
  const result = toResult(response, {
    fallbackMessage: "Could not send the invitation.",
    logMessage: "Invite request failed",
    loggerName: "organization.user-management",
  });
  if (Result.isSuccess(result)) return null;
  return {
    isSuccess: false as const,
    formErrors: [result.message],
    errors: response.success ? undefined : response.error.fields,
    feedback: inviteFeedback(result),
  };
}
