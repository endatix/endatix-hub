import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import {
  USER_FILES_PREFIX,
  buildUserFilePath,
  buildUserFileMetadata,
  buildUserFileRequestHeaders,
  StorageHeaderNames,
} from "../storage-utils";

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
      questionId: "q1",
      formLang: "en",
    };
    const headers = buildUserFileRequestHeaders(context);
    expect(headers[StorageHeaderNames.FORM_ID]).toBe("form-1");
    expect(headers[StorageHeaderNames.SUBMISSION_ID]).toBe("sub-1");
    expect(headers[StorageHeaderNames.FORM_LANG]).toBe("en");
    expect(headers[StorageHeaderNames.QUESTION_ID]).toBe("q1");
  });

  it("uses empty string when submissionId is undefined", () => {
    const context = {
      formId: "f1",
      questionId: "q1",
    };
    const headers = buildUserFileRequestHeaders(context);
    expect(headers[StorageHeaderNames.SUBMISSION_ID]).toBe("");
  });

  it("uses empty string when formLang is undefined", () => {
    const context = {
      formId: "f1",
      submissionId: "s1",
      questionId: "q1",
    };
    const headers = buildUserFileRequestHeaders(context);
    expect(headers[StorageHeaderNames.FORM_LANG]).toBe("");
  });
});

describe("buildUserFileMetadata", () => {
  it("returns metadata with all props and defaults", () => {
    const props = {
      formId: "f1",
      submissionId: "s1",
      questionId: "q1",
      fileName: "doc.pdf",
      fileType: "application/pdf",
      formLang: "en",
    };
    const meta = buildUserFileMetadata(props);
    expect(meta.formId).toBe("f1");
    expect(meta.submissionId).toBe("s1");
    expect(meta.fileName).toBe("doc.pdf");
    expect(meta.fileType).toBe("application/pdf");
    expect(meta.questionId).toBe("q1");
    expect(meta.formLang).toBe("en");
    expect(meta.fileContentDisposition).toBe("inline");
  });

  it("uses default submissionId when undefined", () => {
    const meta = buildUserFileMetadata({
      formId: "f1",
      questionId: "q1",
      fileName: "x",
    });
    expect(meta.submissionId).toBe("no submission id");
  });

  it("uses default fileType when undefined", () => {
    const meta = buildUserFileMetadata({
      formId: "f1",
      submissionId: "s1",
      questionId: "q1",
      fileName: "x",
    });
    expect(meta.fileType).toBe("application/octet-stream");
  });

  it("uses default formLang and fileContentDisposition when undefined", () => {
    const meta = buildUserFileMetadata({
      formId: "f1",
      submissionId: "s1",
      questionId: "q1",
      fileName: "x",
    });
    expect(meta.formLang).toBe("");
    expect(meta.fileContentDisposition).toBe("inline");
  });
});

describe("USER_FILES_PREFIX", () => {
  it("is s/", () => {
    expect(USER_FILES_PREFIX).toBe("s/");
  });
});
