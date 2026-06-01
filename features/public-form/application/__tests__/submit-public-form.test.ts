import type { SubmissionData } from "@/features/submissions/types";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitPublicForm } from "../submit-public-form";

const submissionData: SubmissionData = {
  currentPage: 0,
  isComplete: true,
  jsonData: '{"name":"Ada"}',
};

describe("submitPublicForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success when the submission response is valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          submissionId: "submission-1",
          isComplete: true,
        }),
        { status: 200 },
      ),
    );

    const result = await submitPublicForm("form-1", submissionData);

    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual({
        submissionId: "submission-1",
        isComplete: true,
      });
    }
  });

  it("returns network error when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    const result = await submitPublicForm("form-1", submissionData);

    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.errorCode).toBe(ERROR_CODE.NETWORK_ERROR);
      expect(result.error.details).toMatchObject({
        endpoint: "/api/public/v0/forms/form-1/submissions",
        method: "POST",
        details: "Failed to fetch",
      });
    }
  });

  it("returns json parse error when a successful response body is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", { status: 200 }),
    );

    const result = await submitPublicForm("form-1", submissionData);

    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.errorCode).toBe(ERROR_CODE.JSON_PARSE_ERROR);
      expect(result.error.details).toMatchObject({
        endpoint: "/api/public/v0/forms/form-1/submissions",
        method: "POST",
        statusCode: 200,
      });
    }
  });

  it("keeps non-OK responses on the shared HTTP error mapper path", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Invalid submission",
          detail: "Submission data is invalid.",
          errorCode: ERROR_CODE.VALIDATION_ERROR,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    );

    const result = await submitPublicForm("form-1", submissionData);

    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.errorCode).toBe(ERROR_CODE.VALIDATION_ERROR);
      expect(result.error.details).toMatchObject({
        endpoint: "/api/public/v0/forms/form-1/submissions",
        method: "POST",
        statusCode: 400,
      });
    }
  });
});
