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
] as const)("distinguishes invite feedback for %s %s", async (status, code, expected) => {
  // Arrange
  const response = ApiResult.httpStatusError(status, "Invite response", code);
  // Act & Assert
  const canResumeSetup = vi.fn(async () => false);
  expect((await inviteFailure(response, canResumeSetup))?.feedback?.kind).toBe(expected);
  expect(canResumeSetup).toHaveBeenCalledTimes(expected === "declined" ? 1 : 0);
  expect(TelemetryLogger.error).toHaveBeenCalledTimes(status === 503 || code === "conflict" ? 1 : 0);
});

it("preserves the Terms recovery action when standing changes before an invite is sent", async () => {
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
  const canResumeSetup = vi.fn(async () => true);
  expect(await inviteFailure(response, canResumeSetup)).toMatchObject({
    isSuccess: false, formErrors: ["Review Terms"], feedback: { kind: "standing", refusal },
  });
  expect(TelemetryLogger.error).not.toHaveBeenCalled();
  expect(canResumeSetup).not.toHaveBeenCalled();
});

it("returns no failure or refusal feedback for an accepted invite", async () => {
  // Act & Assert
  expect(await inviteFailure(ApiResult.success({ id: "42" }), vi.fn())).toBeNull();
});

it("offers recovery on a decline only when setup can resume", async () => {
  const declined = ApiResult.httpStatusError(409, "Invite declined", "invite_declined");
  expect((await inviteFailure(declined, async () => true))?.feedback?.kind).toBe("setup");
});
