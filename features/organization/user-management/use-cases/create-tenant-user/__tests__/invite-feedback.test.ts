import { expect, it, vi } from "vitest";
import { TelemetryLogger } from "@/features/telemetry";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";
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

it("preserves the Terms recovery action when standing changes before an invite is sent", () => {
  // Arrange
  const refusal: RequiredActionError = {
    kind: "required_action",
    actions: [{
      key: "saas.legal.terms", scope: "user", severity: "blocking",
      resolvePath: "/accept-terms", canResolve: true, blockNonResolvers: true, resolverRoles: [],
    }],
  };
  const response = ApiResult.httpStatusError(403, "Review Terms", "required_action", { requiredAction: refusal });

  // Act & Assert
  expect(inviteFailure(response)).toMatchObject({
    isSuccess: false, formErrors: ["Review Terms"], feedback: { kind: "standing", refusal },
  });
  expect(TelemetryLogger.error).not.toHaveBeenCalled();
});

it("returns no failure or refusal feedback for an accepted invite", () => {
  // Act & Assert
  expect(inviteFailure(ApiResult.success({ id: "42" }))).toBeNull();
});
