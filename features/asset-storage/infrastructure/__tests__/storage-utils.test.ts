import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import {
  USER_FILES_PREFIX,
  buildContentFolderPath,
  buildUserFileFolderPath,
  buildUserFilePath,
  buildUserFileMetadata,
  buildUserFileRequestHeaders,
  StorageHeaderNames,
} from "../storage-utils";

describe("buildUseFileFolderPath", () => {
  it("returns success with s/{formId}/{submissionId} when both ids valid", () => {
    const result = buildUserFileFolderPath("f1", "s1");
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("s/f1/s1");
    }
  });

  it("returns validation error when formId is empty", () => {
    const result = buildUserFileFolderPath("", "s1");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Form ID is required");
    }
  });

  it("returns validation error when submissionId is empty", () => {
    const result = buildUserFileFolderPath("f1", "");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Submission ID is required");
    }
  });
});

describe("buildUserFilePath", () => {
  it("returns success with s/{formId}/{submissionId}/{fileName} when all inputs valid", () => {
    const result = buildUserFilePath("f1", "s1", "file.pdf");
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("s/f1/s1/file.pdf");
    }
  });

  it("trims fileName before building path", () => {
    const result = buildUserFilePath("f1", "s1", "  file.pdf  ");
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("s/f1/s1/file.pdf");
    }
  });

  it("returns validation error when formId is empty", () => {
    const result = buildUserFilePath("", "s1", "file.pdf");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Form ID is required");
    }
  });

  it("returns validation error when submissionId is empty", () => {
    const result = buildUserFilePath("f1", "", "file.pdf");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Submission ID is required");
    }
  });

  it("returns validation error when fileName is missing or empty", () => {
    const result1 = buildUserFilePath("f1", "s1", "");
    const result2 = buildUserFilePath("f1", "s1", "   ");
    expect(Result.isError(result1)).toBe(true);
    expect(Result.isError(result2)).toBe(true);
    if (Result.isError(result1)) {
      expect(result1.message).toBe("File name is required");
    }
  });
});

describe("buildUserFileRequestHeaders", () => {
  it("returns headers with all keys and values from context", () => {
    const context = {
      formId: "form-1",
      submissionId: "sub-1",
      questionName: "q1",
      formLang: "en",
    };
    const headers = buildUserFileRequestHeaders(context);
    expect(headers[StorageHeaderNames.FORM_ID]).toBe("form-1");
    expect(headers[StorageHeaderNames.SUBMISSION_ID]).toBe("sub-1");
    expect(headers[StorageHeaderNames.FORM_LANG]).toBe("en");
    expect(headers[StorageHeaderNames.QUESTION_NAME]).toBe("q1");
  });

  it("uses empty string when submissionId is undefined", () => {
    const context = {
      formId: "f1",
      questionName: "q1",
    };
    const headers = buildUserFileRequestHeaders(context);
    expect(headers[StorageHeaderNames.SUBMISSION_ID]).toBe("");
  });

  it("uses empty string when formLang is undefined", () => {
    const context = {
      formId: "f1",
      submissionId: "s1",
      questionName: "q1",
    };
    const headers = buildUserFileRequestHeaders(context);
    expect(headers[StorageHeaderNames.FORM_LANG]).toBe("");
  });
});

describe("buildUserFileMetadata", () => {
  it("returns metadata with all props and defaults", () => {
    const props = {
      kind: "user" as const,
      uploadedBy: "user-1",
      formId: "f1",
      submissionId: "s1",
      questionName: "q1",
      displayName: "doc.pdf",
      contentType: "application/pdf",
      formLang: "en",
    };
    const meta = buildUserFileMetadata(props);
    expect(meta.kind).toBe("user");
    expect(meta.uploadedBy).toBe("user-1");
    expect(meta.formId).toBe("f1");
    expect(meta.submissionId).toBe("s1");
    expect(meta.displayName).toBe("doc.pdf");
    expect(meta.contentType).toBe("application/pdf");
    expect(meta.questionName).toBe("q1");
    expect(meta.formLang).toBe("en");
  });

  it("uses default submissionId when undefined", () => {
    const meta = buildUserFileMetadata({
      kind: "user" as const,
      uploadedBy: "user-1",
      formId: "f1",
      questionName: "q1",
      displayName: "x",
      contentType: "application/octet-stream",
    });
    expect(meta.submissionId).toBe("no submission id");
  });

  it("uses default contentType when undefined", () => {
    const meta = buildUserFileMetadata({
      kind: "user" as const,
      uploadedBy: "user-1",
      formId: "f1",
      submissionId: "s1",
      questionName: "q1",
      displayName: "x",
      contentType: undefined,
    } as unknown as Parameters<typeof buildUserFileMetadata>[0]);
    expect(meta.contentType).toBe("application/octet-stream");
  });

  it("uses default formLang when undefined", () => {
    const meta = buildUserFileMetadata({
      kind: "user" as const,
      uploadedBy: "user-1",
      formId: "f1",
      submissionId: "s1",
      questionName: "q1",
      displayName: "x",
      contentType: "application/octet-stream",
    });
    expect(meta.formLang).toBe("");
  });
});

describe("USER_FILES_PREFIX", () => {
  it("is s/", () => {
    expect(USER_FILES_PREFIX).toBe("s/");
  });
});

describe("buildContentFolderPath", () => {
  it("returns f/{formId} for form content", () => {
    const result = buildContentFolderPath("form", "form-1");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("f/form-1");
    }
  });

  it("returns t/{templateId} for template content", () => {
    const result = buildContentFolderPath("template", "template-1");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe("t/template-1");
    }
  });
});
