import { beforeEach, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { PublicFormPermissions } from "@/features/form-access/domain/public-form-permissions";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";
import { POST } from "../route";

const { cookie, policy, partial, personalized, definition, sign } = vi.hoisted(
  () => ({
    cookie: vi.fn(),
    policy: vi.fn(),
    partial: vi.fn(),
    personalized: vi.fn(),
    definition: vi.fn(),
    sign: vi.fn(),
  }),
);
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookie }) }));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "session" }) }));
vi.mock("@/services/api", () => ({ getActiveFormDefinition: definition }));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    forms = { getPublicFormAccess: policy };
    submissions = {
      public: { getByToken: partial, getByAccessToken: personalized },
    };
  },
}));
vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getClientStorageConfig: () => clientStorageConfig({ isPrivate: true }),
  getActiveStorageProvider: () => ({
    isEnabled: () => true,
    generateReadTokenQuery: sign,
  }),
}));

const formId = "12";
const src = `https://${clientStorageConfig().hostName}/content/f/12/lake.png`;
const personalizedToken = "22.1893456000.s.stamp~sig";
function request(context: Record<string, string> = {}) {
  return POST(
    new Request("https://hub.test", {
      method: "POST",
      body: JSON.stringify({ formId, richTextImages: [src], ...context }),
    }),
  );
}
function setCookie(token: string) {
  cookie.mockReturnValue({ value: JSON.stringify({ [formId]: token }) });
}
beforeEach(() => {
  setCookie("abc123");
  partial.mockResolvedValue(ApiResult.notFoundError("No partial submission"));
  personalized.mockResolvedValue(
    ApiResult.notFoundError("No linked submission"),
  );
  policy.mockResolvedValue(
    ApiResult.success({
      formPermissions: [PublicFormPermissions.Form.FileView],
      submissionPermissions: [],
    }),
  );
  definition.mockResolvedValue({
    jsonData: JSON.stringify({ title: `<img src="${src}">` }),
  });
  sign.mockResolvedValue("grant");
});

it("reads the active definition under the signed-in form policy when the optional partial is missing", async () => {
  // Act
  const response = await request();

  // Assert
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    resolved: { [src]: { url: `${src}?grant` } },
  });
  expect(policy).toHaveBeenCalledOnce();
  expect(definition).toHaveBeenCalledExactlyOnceWith(formId, true);
});

it.each([
  [
    "explicit token",
    { token: "abc123", tokenType: "SubmissionToken" },
    "abc123",
  ],
  ["required submission", { submissionId: "19" }, "abc123"],
  ["personalized cookie", {}, personalizedToken],
] as const)(
  "keeps a missing %s context required",
  async (_label, context, token) => {
    // Arrange
    setCookie(token);
    // Act
    const response = await request(context);
    // Assert
    expect(response.status).toBe(403);
    expect(policy).not.toHaveBeenCalled();
    expect(definition).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  },
);

it("requires file-view permission for the active definition after a missing partial", async () => {
  // Arrange
  policy.mockResolvedValue(
    ApiResult.success({ formPermissions: [], submissionPermissions: [] }),
  );
  // Act
  const response = await request();
  // Assert
  expect(response.status).toBe(403);
  expect(definition).not.toHaveBeenCalled();
  expect(sign).not.toHaveBeenCalled();
});

it("does not treat a refused partial read as an absent submission", async () => {
  // Arrange
  partial.mockResolvedValue(
    ApiResult.authError("Forbidden", "forbidden", { statusCode: 403 }),
  );
  // Act
  const response = await request();
  // Assert
  expect(response.status).toBe(403);
  expect(policy).not.toHaveBeenCalled();
  expect(sign).not.toHaveBeenCalled();
});
