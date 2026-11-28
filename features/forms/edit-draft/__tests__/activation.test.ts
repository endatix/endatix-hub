import { beforeEach, expect, it, vi } from "vitest";
import { formPublishFlag } from "@/lib/feature-flags/form-publish.server";
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
vi.mock("next/server", async actual => ({
  ...await actual<typeof import("next/server")>(), connection: vi.fn(async () => {}),
}));
vi.mock("@/lib/feature-flags/factories/flag-factory-provider", () => ({
  flagFactoryProvider: { getFactory: () => { throw new Error("A cohort cannot select the editor write contract."); } },
}));
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
  vi.stubEnv("FLAG_PROVIDER", "posthog");
  vi.stubEnv("POSTHOG_PROJECT_TOKEN", "test-token");
  patch.mockResolvedValue({ success: true, data: {} });
  replace.mockResolvedValue({
    success: true,
    data: { version: "9007199254741000" },
  });
});

it("keeps the immediate save usable and rejects a stale draft tab when rollout is off", async () => {
  vi.stubEnv("FLAG_FORM_PUBLISH", undefined);
  expect(await formPublishFlag()).toBe(false);
  expect(
    Result.isSuccess(await saveActiveDefinitionAction("17", request.jsonData)),
  ).toBe(true);
  expect(patch).toHaveBeenCalledWith("/forms/17/definition", {
    isDraft: false,
    jsonData: request.jsonData,
  });
  expect((await saveDraftAction("17", scope, request)).kind).toBe("modeChanged");
  expect(replace).not.toHaveBeenCalled();
});

it("writes only the draft after activation, including when an older tab attempts a manual save", async () => {
  vi.stubEnv("FLAG_FORM_PUBLISH", "true");
  expect(await formPublishFlag()).toBe(true);
  expect(
    Result.isError(await saveActiveDefinitionAction("17", request.jsonData)),
  ).toBe(true);
  expect(patch).not.toHaveBeenCalled();
  expect((await saveDraftAction("17", scope, request)).kind).toBe("saved");
  expect(replace).toHaveBeenCalledWith("17", request.version, request.jsonData);
});
