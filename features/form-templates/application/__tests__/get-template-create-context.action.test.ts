import { beforeEach, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";
import { Result } from "@/lib/result";
import { getTemplateCreateContextAction } from "../get-template-create-context.action";

const { settings, folders } = vi.hoisted(() => ({
  settings: vi.fn(),
  folders: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "member" }) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ requireHubAccess: async () => undefined }),
}));
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    tenant = { getSettings: settings };
    folders = { list: folders };
  },
}));

beforeEach(() => {
  settings.mockResolvedValue(
    ApiResult.success({ requireFolderAssignment: true }),
  );
  folders.mockResolvedValue(ApiResult.success([]));
});

const requiredAction: RequiredActionError = {
  kind: "required_action",
  actions: [],
};
const failures = [
  { code: "required_action", status: 403, refusal: requiredAction },
  { code: "access_forbidden", status: 403, refusal: undefined },
  { code: "service_unavailable", status: 503, refusal: undefined },
];
it("shows an account action before an outage, but keeps ordinary denial first", async () => {
  // Arrange
  folders.mockResolvedValue(
    ApiResult.forbiddenError("Review required", "required_action", {
      requiredAction,
      statusCode: 403,
    }),
  );
  settings
    .mockResolvedValueOnce(
      ApiResult.networkError("Unavailable", { statusCode: 503 }),
    )
    .mockResolvedValueOnce(
      ApiResult.forbiddenError("Access denied", "access_forbidden", {
        statusCode: 403,
      }),
    );

  // Act & Assert
  expect(await getTemplateCreateContextAction()).toMatchObject({
    requiredAction,
  });
  expect(await getTemplateCreateContextAction()).toMatchObject({
    errorCode: "access_forbidden",
  });
});
it.each(["settings", "folders"] as const)(
  "preserves typed failures reading %s",
  async (source) => {
    // Arrange
    const read = { settings, folders }[source];

    // Act & Assert
    for (const { code, status, refusal } of failures) {
      const details = { statusCode: status, requiredAction: refusal };
      read.mockResolvedValue(
        status === 503
          ? ApiResult.serverError("Unavailable", details, code)
          : ApiResult.forbiddenError("Denied", code, details),
      );
      expect(await getTemplateCreateContextAction()).toMatchObject({
        statusCode: status,
        requiredAction: refusal,
        errorCode: code,
      });
    }
  },
);

it.each([true, false])(
  "keeps an empty active list when assignment is %s",
  async (required) => {
    // Arrange
    settings.mockResolvedValue(
      ApiResult.success({ requireFolderAssignment: required }),
    );
    folders.mockResolvedValue(
      ApiResult.success([{ id: "7", name: "Inactive", isActive: false }]),
    );

    // Act & Assert
    expect(await getTemplateCreateContextAction()).toEqual(
      Result.success({
        requireFolderAssignment: required,
        folders: [],
      }),
    );
  },
);
