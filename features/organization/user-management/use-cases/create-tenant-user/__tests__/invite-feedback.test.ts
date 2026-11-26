import { expect, it, vi } from "vitest";
import { TelemetryLogger } from "@/features/telemetry";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { inviteFailure } from "../invite-feedback";

vi.mock("@/features/telemetry", () => ({ TelemetryLogger: { error: vi.fn() } }));

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
  expect(TelemetryLogger.error).toHaveBeenCalledTimes(status === 503 || code === "conflict" ? 1 : 0);
});
