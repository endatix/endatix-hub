import { beforeEach, expect, it, vi } from "vitest";
import { formPublishFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { saveActiveDefinitionAction } from "../save-active-definition.action";
import { saveDraftAction } from "../save-draft.action";

const { patch, replace } = vi.hoisted(() => ({
  patch: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/auth", () => ({
  auth: async () => ({ accessToken: "session-token" }),
}));
vi.mock("@/lib/feature-flags/flags", () => ({ formPublishFlag: vi.fn() }));
vi.mock("@/lib/endatix-api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    patch = patch;
    forms = { drafts: { replace } };
  },
}));
vi.mock("@/features/auth/authorization", async (importActual) => ({
  ...(await importActual<typeof import("@/features/auth/authorization")>()),
  authorization: async () => ({
    requireAllPermissions: vi.fn(),
    checkAllPermissions: async () => ({ success: true }),
    getAuthorizationData: async () => ({
      success: true,
      data: { userId: "14", tenantId: "82" },
    }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const request = { jsonData: '{"title":"Edit"}', version: "9007199254740999" };
const scope = JSON.stringify(["82", "14", "17"]);
beforeEach(() => {
  patch.mockResolvedValue({ success: true, data: {} });
  replace.mockResolvedValue({
    success: true,
    data: { version: "9007199254741000" },
  });
});

it("keeps the immediate save usable and rejects a stale draft tab when rollout is off", async () => {
  vi.mocked(formPublishFlag).mockResolvedValue(false);
  expect(
    Result.isSuccess(await saveActiveDefinitionAction("17", request.jsonData)),
  ).toBe(true);
  expect(patch).toHaveBeenCalledWith("/forms/17/definition", {
    isDraft: false,
    jsonData: request.jsonData,
  });
  expect((await saveDraftAction("17", scope, request)).kind).toBe("error");
  expect(replace).not.toHaveBeenCalled();
});

it("writes only the draft after activation, including when an older tab attempts a manual save", async () => {
  vi.mocked(formPublishFlag).mockResolvedValue(true);
  expect(
    Result.isError(await saveActiveDefinitionAction("17", request.jsonData)),
  ).toBe(true);
  expect(patch).not.toHaveBeenCalled();
  expect((await saveDraftAction("17", scope, request)).kind).toBe("saved");
  expect(replace).toHaveBeenCalledWith("17", request.version, request.jsonData);
});
