import type { ApiError } from "@/lib/endatix-api";

export function inviteFeedback({ error }: ApiError) {
  const status = error.details?.statusCode;
  if (status === 409 && error.errorCode === "invite_declined") return "declined";
  if (status === 503) return "unavailable";
  return undefined;
}
