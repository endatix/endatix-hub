import { expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { createTenantUserAction } from "../create-tenant-user.action";

const create = vi.hoisted(() => vi.fn());
const readSetup = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "owner" }) }));
vi.mock("@/features/auth/authorization", async original => ({
  ...(await original<object>()), authorization: async () => ({
    requirePermission: vi.fn(), checkAllPermissions: async () => ({ success: true }),
  }),
}));
vi.mock("@/lib/feature-flags/flags", () => ({ saasManagementFlag: async () => true }));
vi.mock("@/lib/endatix-api", async original => ({
  ...(await original<object>()), EndatixApi: class { users = { create }; get = readSetup; },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

it.each([true, false])("does not replay an invite when setup recovery is available: %s", async (eligible) => {
  create.mockResolvedValueOnce(ApiResult.httpStatusError(409, "Invite declined", "invite_declined"));
  readSetup.mockResolvedValueOnce(eligible
    ? ApiResult.success({ state: "offered", choices: ["blank"], formId: null })
    : ApiResult.notFoundError("No owner receipt"));
  const payload = { email: "invitee@example.test", roles: [] };
  const result = await createTenantUserAction({ isSuccess: undefined }, payload);
  expect(result).toMatchObject({ isSuccess: false, data: payload, feedback: { kind: eligible ? "setup" : "declined" } });
  expect(create).toHaveBeenCalledTimes(1);
});

it("preserves the invite decline if optional owner setup cannot be read", async () => {
  create.mockResolvedValueOnce(ApiResult.httpStatusError(409, "Invite declined", "invite_declined"));
  readSetup.mockRejectedValueOnce(new Error("Receipt unavailable"));
  const payload = { email: "invitee@example.test", roles: [] };
  const result = await createTenantUserAction({ isSuccess: undefined }, payload);
  expect(result).toMatchObject({ isSuccess: false, data: payload, feedback: { kind: "declined" } });
  expect(create).toHaveBeenCalledTimes(1);
});
