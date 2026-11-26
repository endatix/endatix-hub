import { expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { canResumeWorkspaceSetup } from "@/features/onboarding/server";
import { createTenantUserAction } from "../create-tenant-user.action";

const create = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "owner" }) }));
vi.mock("@/features/auth/authorization", async original => ({
  ...(await original<object>()), authorization: async () => ({ requirePermission: vi.fn() }),
}));
vi.mock("@/features/onboarding/server", () => ({ canResumeWorkspaceSetup: vi.fn() }));
vi.mock("@/lib/endatix-api", async original => ({
  ...(await original<object>()), EndatixApi: class { users = { create }; },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

it.each([true, false])("does not replay an invite when setup recovery is available: %s", async (eligible) => {
  create.mockResolvedValueOnce(ApiResult.httpStatusError(409, "Invite declined", "invite_declined"));
  vi.mocked(canResumeWorkspaceSetup).mockResolvedValueOnce(eligible);
  const payload = { email: "invitee@example.test", roles: [] };
  const result = await createTenantUserAction({ isSuccess: undefined }, payload);
  expect(result).toMatchObject({ isSuccess: false, data: payload, feedback: { kind: eligible ? "setup" : "declined" } });
  expect(create).toHaveBeenCalledTimes(1);
});
