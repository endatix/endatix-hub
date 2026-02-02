import { POST } from "@/app/api/public/v0/storage/upload/route";
import * as headersModule from "next/headers";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { uploadUserFilesUseCase } from "@/features/asset-storage/server";
import { StorageHeaderNames } from "@/features/asset-storage/infrastructure/storage-utils";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock(
  "@/features/public-form/use-cases/create-initial-submission.use-case",
  () => ({
    createInitialSubmissionUseCase: vi.fn(),
  }),
);

vi.mock("@/features/asset-storage/server", () => ({
  uploadUserFilesUseCase: vi.fn(),
}));

function setHeaders(options: {
  formId?: string;
  submissionId?: string;
  formLang?: string | null;
  questionId?: string | null;
}): void {
  const h = new Headers();
  if (options.formId != null) h.set(StorageHeaderNames.FORM_ID, options.formId);
  if (options.submissionId != null)
    h.set(StorageHeaderNames.SUBMISSION_ID, options.submissionId);
  if (options.formLang != null)
    h.set(StorageHeaderNames.FORM_LANG, options.formLang);
  if (options.questionId != null)
    h.set(StorageHeaderNames.QUESTION_ID, options.questionId);
  vi.mocked(headersModule.headers).mockResolvedValue(
    h as Awaited<ReturnType<typeof headersModule.headers>>,
  );
}

function createRequestWithFiles(
  files: { name: string; content: string; filename?: string }[],
): Request {
  const formData = new FormData();
  for (const f of files) {
    formData.append(
      f.name,
      new Blob([f.content], { type: "application/octet-stream" }),
      f.filename ?? f.name,
    );
  }
  return new Request("http://localhost/api/public/v0/storage/upload", {
    method: "POST",
    body: formData,
  });
}

function createRequestWithEmptyFormData(): Request {
  return new Request("http://localhost/api/public/v0/storage/upload", {
    method: "POST",
    body: new FormData(),
  });
}

describe("POST /api/public/v0/storage/upload", () => {
  const formId = "f1";
  const submissionId = "s1";
  const mockUploadResult = [
    { name: "doc", url: "https://storage.example/s/f1/s1/doc.pdf" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headersModule.headers).mockResolvedValue(
      new Headers() as Awaited<ReturnType<typeof headersModule.headers>>,
    );
    vi.mocked(uploadUserFilesUseCase).mockResolvedValue(
      Result.success(mockUploadResult),
    );
  });

  it("returns 400 when Form ID is missing", async () => {
    setHeaders({ submissionId });
    const req = createRequestWithFiles([
      { name: "doc", content: "x", filename: "doc.pdf" },
    ]);

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Form ID is required");
    expect(uploadUserFilesUseCase).not.toHaveBeenCalled();
  });

  it("calls createInitialSubmissionUseCase when submissionId is missing", async () => {
    vi.mocked(createInitialSubmissionUseCase).mockResolvedValue(
      ApiResult.success({ submissionId: "new-sub-id" }) as Awaited<
        ReturnType<typeof createInitialSubmissionUseCase>
      >,
    );
    setHeaders({ formId, formLang: "en" });
    const req = createRequestWithFiles([
      { name: "doc", content: "x", filename: "doc.pdf" },
    ]);

    const res = await POST(req);

    expect(createInitialSubmissionUseCase).toHaveBeenCalledWith(
      formId,
      "en",
      "Generate submissionId for image upload",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.submissionId).toBe("new-sub-id");
  });

  it("returns 400 when submissionId is missing and createInitialSubmission fails", async () => {
    vi.mocked(createInitialSubmissionUseCase).mockResolvedValue(
      ApiResult.validationError("Form not found") as Awaited<
        ReturnType<typeof createInitialSubmissionUseCase>
      >,
    );
    setHeaders({ formId });
    const req = createRequestWithFiles([
      { name: "doc", content: "x", filename: "doc.pdf" },
    ]);

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(uploadUserFilesUseCase).not.toHaveBeenCalled();
  });

  it("returns 400 when no files in formData", async () => {
    setHeaders({ formId, submissionId });
    const req = createRequestWithEmptyFormData();

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No files provided");
    expect(uploadUserFilesUseCase).not.toHaveBeenCalled();
  });

  it("returns 200 and upload result when formId, submissionId, and files provided", async () => {
    setHeaders({ formId, submissionId, questionId: "q1", formLang: "en" });
    const req = createRequestWithFiles([
      { name: "doc", content: "content", filename: "doc.pdf" },
    ]);

    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submissionId).toBe(submissionId);
    expect(body.files).toEqual(mockUploadResult);
    expect(uploadUserFilesUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        formId,
        submissionId,
        files: expect.any(Array),
        additionalMetadata: expect.objectContaining({
          formId,
          submissionId,
          questionId: "q1",
          language: "en",
        }),
      }),
    );
  });

  it("returns 400 when uploadUserFilesUseCase returns error", async () => {
    vi.mocked(uploadUserFilesUseCase).mockResolvedValue(
      Result.error("Storage is not enabled"),
    );
    setHeaders({ formId, submissionId });
    const req = createRequestWithFiles([
      { name: "doc", content: "x", filename: "doc.pdf" },
    ]);

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Storage is not enabled");
  });
});
