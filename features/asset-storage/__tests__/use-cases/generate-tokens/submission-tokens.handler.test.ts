/**
 * Integration tests for submission tokens handler
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Result } from "@/lib/result";
import { ApiResult } from "@/lib/endatix-api";
import { submissionTokensHandler } from "@/features/asset-storage/use-cases/generate-tokens/submission-tokens.handler";

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
  return { ...actual };
});

vi.mock("@/features/auth/access-control/form-access.factory", () => ({
  createFormAccessService: vi.fn(),
}));

vi.mock(
  "@/features/public-form/use-cases/create-initial-submission.use-case",
  () => ({
    createInitialSubmissionUseCase: vi.fn(),
  }),
);

vi.mock("@/features/asset-storage/infrastructure/storage-utils", () => ({
  buildUserFileFolderPath: vi.fn(),
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
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { buildUserFileFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
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

describe("submissionTokensHandler", () => {
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
    it("should return badRequest when validation fails", async () => {
      const req = createMockRequest({ fileNames: ["test.pdf"] });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(400);
    });

    it("should return badRequest when fileNames is invalid", async () => {
      const req = createMockRequest({ formId: "form-1" });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(400);
    });
  });

  describe("authorization", () => {
    it("should return forbidden when user cannot upload files", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canUploadFile: () => false,
      } as any);

      const req = createMockRequest({
        formId: "form-1",
        fileNames: ["test.pdf"],
      });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(403);
    });

    it("should proceed when authorized", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canUploadFile: () => true,
      } as any);
      vi.mocked(buildUserFileFolderPath).mockReturnValue(
        Result.success("forms/form-1/subs/sub-1"),
      );

      const req = createMockRequest({
        formId: "form-1",
        submissionId: "sub-1",
        fileNames: ["test.pdf"],
      });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(200);
    });
  });

  describe("storage resolution", () => {
    it("should create submission when submissionId not provided", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canUploadFile: () => true,
      } as any);
      vi.mocked(createInitialSubmissionUseCase).mockResolvedValue(
        ApiResult.success({ submissionId: "auto-sub", formId: "form-1" }),
      );
      vi.mocked(buildUserFileFolderPath).mockReturnValue(
        Result.success("forms/form-1/subs/auto-sub"),
      );

      const req = createMockRequest({
        formId: "form-1",
        fileNames: ["test.pdf"],
      });
      const result = await submissionTokensHandler(req);

      expect(createInitialSubmissionUseCase).toHaveBeenCalled();
      expect(result.status).toBe(200);
    });

    it("should return badRequest when submission creation fails", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canUploadFile: () => true,
      } as any);
      vi.mocked(createInitialSubmissionUseCase).mockResolvedValue(
        ApiResult.validationError("Form not found"),
      );

      const req = createMockRequest({
        formId: "form-1",
        fileNames: ["test.pdf"],
      });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(400);
    });

    it("should return badRequest when folder path fails", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canUploadFile: () => true,
      } as any);
      vi.mocked(buildUserFileFolderPath).mockReturnValue(
        Result.validationError("Invalid formId"),
      );

      const req = createMockRequest({
        formId: "form-1",
        submissionId: "sub-1",
        fileNames: ["test.pdf"],
      });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(400);
    });
  });

  describe("complete flow", () => {
    it("should return tokens on successful flow", async () => {
      vi.mocked(createFormAccessService).mockResolvedValue({
        canUploadFile: () => true,
      } as any);
      vi.mocked(buildUserFileFolderPath).mockReturnValue(
        Result.success("forms/form-1/subs/sub-1"),
      );

      const req = createMockRequest({
        formId: "form-1",
        submissionId: "sub-1",
        fileNames: ["test.pdf"],
      });
      const result = await submissionTokensHandler(req);

      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.tokens).toBeDefined();
    });
  });
});
