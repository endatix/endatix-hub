import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { PublicFormPermissions } from "@/features/form-access/domain/public-form-permissions";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";
import { POST } from "../route";

const {
  session,
  cookie,
  policy,
  partial,
  personalized,
  definition,
  publicDefinition,
  sign,
} = vi.hoisted(() => ({
  cookie: vi.fn(),
  session: vi.fn(),
  publicDefinition: vi.fn(),
  policy: vi.fn(),
  partial: vi.fn(),
  personalized: vi.fn(),
  definition: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookie }) }));
vi.mock("@/auth", () => ({ auth: session }));
vi.mock("@/services/api", () => ({ getActiveFormDefinition: definition }));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    get = publicDefinition;
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
  session.mockResolvedValue({ accessToken: "session" });
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
  publicDefinition.mockResolvedValue(
    ApiResult.success({
      jsonData: JSON.stringify({ title: `<img src="${src}">` }),
    }),
  );
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

describe.each(["signed-in", "anonymous"])("%s reader", (viewer) => {
  beforeEach(() => {
    if (viewer === "anonymous") session.mockResolvedValue(null);
  });
  it.each([
    [
      "explicit token",
      { token: "abc123", tokenType: "SubmissionToken" },
      "abc123",
    ],
    ["required submission", { submissionId: "19" }, "abc123"],
    ["personalized cookie", {}, personalizedToken],
    ["explicit personalized link", { token: personalizedToken }, "abc123"],
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
});

it("reads an anonymous active public definition only after file-view permission", async () => {
  // Arrange
  session.mockResolvedValue(null);
  // Act
  const response = await request();
  // Assert
  expect(await response.json()).toEqual({
    resolved: { [src]: { url: `${src}?grant` } },
  });
  expect(policy).toHaveBeenCalledOnce();
  expect(publicDefinition).toHaveBeenCalledExactlyOnceWith(
    `/forms/${formId}/definition`,
    { requireAuth: false },
  );
  expect(definition).not.toHaveBeenCalled();
});

it("requires an active public definition for an anonymous resume", async () => {
  // Arrange
  session.mockResolvedValue(null);
  publicDefinition.mockResolvedValue(ApiResult.notFoundError("Unavailable"));
  // Act & Assert
  expect((await request()).status).toBe(403);
  expect(sign).not.toHaveBeenCalled();
});

it("only signs images referenced in the active public definition selected for a resume", async () => {
  // Arrange
  session.mockResolvedValue(null);
  publicDefinition.mockResolvedValue(
    ApiResult.success({ jsonData: '{"title":"A survey"}' }),
  );
  // Act
  const response = await request();
  // Assert
  expect(await response.json()).toEqual({
    resolved: { [src]: { error: expect.any(String) } },
  });
  expect(sign).not.toHaveBeenCalled();
});

it.each(["anonymous", "signed-in"])(
  "requires file-view permission after a missing partial for %s readers",
  async (viewer) => {
    // Arrange
    if (viewer === "anonymous") session.mockResolvedValue(null);
    policy.mockResolvedValue(
      ApiResult.success({ formPermissions: [], submissionPermissions: [] }),
    );
    // Act
    const response = await request();
    // Assert
    expect(response.status).toBe(403);
    expect(definition).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  },
);

it.each(["anonymous", "signed-in"])(
  "does not treat a refused partial read as absent for %s readers",
  async (viewer) => {
    // Arrange
    if (viewer === "anonymous") session.mockResolvedValue(null);
    partial.mockResolvedValue(
      ApiResult.authError("Forbidden", "forbidden", { statusCode: 403 }),
    );
    // Act
    const response = await request();
    // Assert
    expect(response.status).toBe(403);
    expect(policy).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  },
);

it.each(["anonymous", "signed-in"])(
  "requires definitive absence to resume for %s readers",
  async (viewer) => {
    // Arrange
    if (viewer === "anonymous") session.mockResolvedValue(null);
    partial.mockResolvedValue(ApiResult.validationError("Invalid partial"));
    // Act & Assert
    expect((await request()).status).toBe(403);
    expect(policy).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  },
);
