/**
 * Integration tests for content tokens handler
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Result } from "@/lib/result";
import { contentTokensHandler } from "@/features/asset-storage/use-cases/generate-tokens/content-tokens.handler";

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
  generateUploadUrl: vi.fn(),
}));

vi.mock("@/features/asset-storage/utils", () => ({
  generateUniqueFileName: vi.fn((fileName: string) => Result.success(fileName)),
}));

import * as authModule from "@/auth";
import { createFormAccessService } from "@/features/auth/access-control/form-access.factory";
import { buildContentFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
import {
  getContainerNames,
  generateUploadUrl,
} from "@/features/asset-storage/server";

const createMockRequest = (body: any) => {
  return {
    json: vi.fn().mockResolvedValue(body),
    nextUrl: new URL("http://localhost"),
  } as unknown as NextRequest;
};

describe("contentTokensHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "test-user" },
    } as any);
    vi.mocked(getContainerNames).mockReturnValue({
      CONTENT: "content",
      USER_FILES: "user-files",
    });
    vi.mocked(generateUploadUrl).mockResolvedValue(
      "https://example.com/sas?token=abc",
    );
  });

  describe("validation errors", () => {
    it("should return badRequest when itemId is missing", async () => {
      const req = createMockRequest({
        itemType: "form",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(400);
    });

    it("should return badRequest when itemType is missing", async () => {
      const req = createMockRequest({
        itemId: "form-1",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(400);
    });

    it("should return badRequest when fileNames is invalid", async () => {
      const req = createMockRequest({ itemId: "form-1", itemType: "form" });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(400);
    });
  });

  describe("authorization", () => {
    it("should return forbidden when user cannot design form", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canDesignForm: () => false,
      } as any);

      const req = createMockRequest({
        itemId: "form-1",
        itemType: "form",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(403);
    });

    it("should proceed when authorized for form", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canDesignForm: () => true,
      } as any);
      vi.mocked(buildContentFolderPath).mockReturnValue(
        Result.success("content/form-1"),
      );

      const req = createMockRequest({
        itemId: "form-1",
        itemType: "form",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(200);
    });

    it("should allow template uploads without form access check", async () => {
      vi.mocked(buildContentFolderPath).mockReturnValue(
        Result.success("content/template-1"),
      );

      const req = createMockRequest({
        itemId: "template-1",
        itemType: "template",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(200);
      expect(createFormAccessService).not.toHaveBeenCalled();
    });
  });

  describe("storage resolution", () => {
    it("should return badRequest when folder path fails", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canDesignForm: () => true,
      } as any);
      vi.mocked(buildContentFolderPath).mockReturnValue(
        Result.validationError("Invalid itemId"),
      );

      const req = createMockRequest({
        itemId: "form-1",
        itemType: "form",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(400);
    });
  });

  describe("complete flow", () => {
    it("should return tokens on successful flow", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canDesignForm: () => true,
      } as any);
      vi.mocked(buildContentFolderPath).mockReturnValue(
        Result.success("content/form-1"),
      );

      const req = createMockRequest({
        itemId: "form-1",
        itemType: "form",
        fileNames: ["test.pdf"],
      });
      const result = await contentTokensHandler(req);
      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.tokens).toBeDefined();
    });
  });
});
