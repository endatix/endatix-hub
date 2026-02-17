/**
 * Unit tests for content tokens strategy functions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { ApiResult } from "@/lib/endatix-api";
import {
  contentTokensValidate,
  contentTokensAuthorize,
  contentTokensResolveStorage,
} from "@/features/asset-storage/use-cases/generate-tokens/content-tokens.strategy";

vi.mock("next-auth", () => ({
  default: vi.fn().mockImplementation(() => ({})),
  CredentialsSignin: class extends Error {
    constructor() {
      super("Invalid credentials");
      this.name = "CredentialsSignin";
    }
  },
  AuthError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AuthError";
    }
  },
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/features/auth", async () => {
  const actual = await vi.importActual("@/features/auth");
  return {
    ...actual,
    authorization: vi.fn().mockResolvedValue({
      requireHubAccess: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

vi.mock("@/features/auth/access-control/form-access.factory", () => ({
  createFormAccessService: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/storage-utils", () => ({
  buildContentFolderPath: vi.fn(),
}));

vi.mock("@/features/asset-storage/server", () => ({
  getContainerNames: vi.fn(),
}));

import { createFormAccessService } from "@/features/auth/access-control/form-access.factory";
import { buildContentFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
import {
  ContentItemType,
  ContentTokenRequest,
  getContainerNames,
} from "@/features/asset-storage/server";
import { AuthorizationResult } from "@/features/auth";

describe("contentTokensValidate", () => {
  it("should return validation error when itemId is missing", () => {
    const data = { itemId: "", itemType: "form", fileNames: ["test.pdf"] };
    const result = contentTokensValidate(data as ContentTokenRequest);
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("Item ID");
  });

  it("should return validation error when itemId is empty", () => {
    const data = { itemId: "  ", itemType: "form", fileNames: ["test.pdf"] };
    const result = contentTokensValidate(data as ContentTokenRequest);
    expect(Result.isError(result)).toBe(true);
  });

  it("should return validation error when itemType is missing", () => {
    const data = { itemId: "form-1", fileNames: ["test.pdf"] };
    const result = contentTokensValidate(data as ContentTokenRequest);
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("Item type");
  });

  it("should return validation error when fileNames is missing", () => {
    const data = { itemId: "form-1", itemType: "form" };
    const result = contentTokensValidate(data as ContentTokenRequest);
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("File names");
  });

  it("should return validation error when fileNames is empty array", () => {
    const data = { itemId: "form-1", itemType: "form", fileNames: [] };
    const result = contentTokensValidate(data as ContentTokenRequest);
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("File names");
  });

  it("should return success when all required fields are valid", () => {
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = contentTokensValidate(data as ContentTokenRequest);
    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("contentTokensAuthorize", () => {
  const mockSession = { user: { id: "user-1" } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getContainerNames).mockReturnValue({
      CONTENT: "content",
      USER_FILES: "user-files",
    });
  });

  it("should allow template uploads without form access check", async () => {
    const data = {
      itemId: "template-1",
      itemType: "template",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensAuthorize({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(result.success).toBe(true);
    expect(createFormAccessService).not.toHaveBeenCalled();
  });

  it("should return forbidden when user cannot design form", async () => {
    vi.mocked(createFormAccessService).mockResolvedValue({
      canDesignForm: () => false,
    } as any);
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensAuthorize({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(AuthorizationResult.isError(result)).toBe(true);
    if (AuthorizationResult.isError(result))
      expect(AuthorizationResult.getErrorMessage(result)).toContain(
        "permission",
      );
  });

  it("should allow when user can design form", async () => {
    vi.mocked(createFormAccessService).mockResolvedValue({
      canDesignForm: () => true,
    } as any);
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensAuthorize({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(result.success).toBe(true);
  });
});

describe("contentTokensResolveStorage", () => {
  const mockSession = { user: { id: "user-1" } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getContainerNames).mockReturnValue({ CONTENT: "content", USER_FILES: "user-files" });
  });

  it("should return error when buildContentFolderPath fails", async () => {
    vi.mocked(buildContentFolderPath).mockReturnValue(
      Result.validationError("Invalid itemId"),
    );
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensResolveStorage({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(ApiResult.isError(result)).toBe(true);
  });

  it("should return storage context on success", async () => {
    vi.mocked(buildContentFolderPath).mockReturnValue(
      Result.success("content/form-1"),
    );
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensResolveStorage({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data.containerName).toBe("content");
      expect(result.data.extra?.itemId).toBe("form-1");
      expect(result.data.extra?.contentItemType).toBe("form");
      expect(result.data.extra?.userId).toBe("user-1");
    }
  });

  it("should use userId from session", async () => {
    vi.mocked(buildContentFolderPath).mockReturnValue(
      Result.success("content/form-1"),
    );
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensResolveStorage({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data.extra?.userId).toBe("user-1");
    }
  });

  it("should use empty userId when session is undefined", async () => {
    vi.mocked(buildContentFolderPath).mockReturnValue(
      Result.success("content/form-1"),
    );
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
    };
    const result = await contentTokensResolveStorage({
      session: null as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data.extra?.userId).toBe("");
    }
  });

  it("should include questionName when provided", async () => {
    vi.mocked(buildContentFolderPath).mockReturnValue(
      Result.success("content/form-1"),
    );
    const data = {
      itemId: "form-1",
      itemType: "form",
      fileNames: ["test.pdf"],
      questionName: "my-question",
    };
    const result = await contentTokensResolveStorage({
      session: mockSession as any,
      data: data as ContentTokenRequest,
      request: null as any,
    });
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data.extra?.questionName).toBe("my-question");
    }
  });
});
