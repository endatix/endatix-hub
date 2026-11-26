import { expect, it } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { inviteFailure } from "../invite-feedback";

it.each([
  [409, "invite_declined", "declined"],
  [409, "conflict", undefined],
  [403, "invite_declined", undefined],
  [503, undefined, "unavailable"],
] as const)("distinguishes invite feedback for %s %s", (status, code, expected) => {
  // Arrange
  const response = ApiResult.httpStatusError(status, "Invite response", code);
  // Act & Assert
  expect(inviteFailure(response)?.feedback?.kind).toBe(expected);
});
