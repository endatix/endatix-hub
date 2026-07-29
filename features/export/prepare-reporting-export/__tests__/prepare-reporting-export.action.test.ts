import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { prepareReportingExportAction } from "../prepare-reporting-export.action";

const mockRequireHubAccess = vi.fn();
const mockCompileSchema = vi.fn();
const mockBackfillSubmissions = vi.fn();
const mockReportingExportFlag = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn().mockResolvedValue({
    requireHubAccess: (...args: unknown[]) => mockRequireHubAccess(...args),
  }),
}));

vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: (...args: unknown[]) =>
    mockReportingExportFlag(...args),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      reporting: {
        compileSchema: (...args: unknown[]) => mockCompileSchema(...args),
        backfillSubmissions: (...args: unknown[]) =>
          mockBackfillSubmissions(...args),
      },
    };
  }),
}));

describe("prepareReportingExportAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireHubAccess.mockResolvedValue(undefined);
    mockReportingExportFlag.mockResolvedValue(true);
    mockCompileSchema.mockResolvedValue(
      ApiResult.success({ formDefinitionId: "def-1" }),
    );
    mockBackfillSubmissions.mockResolvedValue(
      ApiResult.success({
        processed: 2,
        skipped: 0,
        failed: 0,
        hasMore: false,
        nextAfterSubmissionId: null,
      }),
    );
  });

  it("compiles and backfills without replace/force by default", async () => {
    const result = await prepareReportingExportAction("form-1");

    expect(mockCompileSchema).toHaveBeenCalledWith("form-1", {
      replace: false,
    });
    expect(mockBackfillSubmissions).toHaveBeenCalledWith("form-1", {
      batchSize: 100,
      afterSubmissionId: undefined,
      force: false,
    });
    expect(Result.isSuccess(result)).toBe(true);
    expect(result.value).toEqual({
      formDefinitionId: "def-1",
      batches: 1,
      processed: 2,
      skipped: 0,
      failed: 0,
    });
  });

  it("passes replace and force when fullRecompile is true", async () => {
    const result = await prepareReportingExportAction("form-1", {
      fullRecompile: true,
    });

    expect(mockCompileSchema).toHaveBeenCalledWith("form-1", {
      replace: true,
    });
    expect(mockBackfillSubmissions).toHaveBeenCalledWith("form-1", {
      batchSize: 100,
      afterSubmissionId: undefined,
      force: true,
    });
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("maps compile API failures via Result.error", async () => {
    mockCompileSchema.mockResolvedValueOnce(
      ApiResult.serverError("Compile blew up"),
    );

    const result = await prepareReportingExportAction("form-1");

    expect(Result.isError(result)).toBe(true);
    expect(mockBackfillSubmissions).not.toHaveBeenCalled();
  });
});
