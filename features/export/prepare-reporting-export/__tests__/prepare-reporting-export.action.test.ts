import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { mapResponseToApiError } from "@/lib/endatix-api/shared/http-error-mapper";
import { prepareReportingExportAction } from "../prepare-reporting-export.action";

const mockRequireHubAccess = vi.fn();
const mockCheckPermission = vi.fn();
const mockCompileSchema = vi.fn();
const mockBackfillSubmissions = vi.fn();
const mockReportingExportFlag = vi.fn();
const telemetry = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));

vi.mock("@/features/telemetry", () => ({ TelemetryLogger: telemetry }));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", async () => {
  const domain =
    await import("@/features/auth/authorization/domain/authorization-result");
  return {
    Permissions: { Forms: { Edit: "forms.edit" } },
    isPermissionDenied: domain.isPermissionDenied,
    authorization: vi.fn().mockResolvedValue({
      requireHubAccess: (...args: unknown[]) => mockRequireHubAccess(...args),
      checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
    }),
  };
});

vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: (...args: unknown[]) => mockReportingExportFlag(...args),
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
    telemetry.error.mockClear();
    telemetry.warn.mockClear();
    mockRequireHubAccess.mockResolvedValue(undefined);
    mockCheckPermission.mockResolvedValue(AuthorizationResult.success());
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
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        formDefinitionId: "def-1",
        batches: 1,
        processed: 2,
        skipped: 0,
        failed: 0,
      });
    }
  });

  it("finishes when the last page is exactly the batch cap", async () => {
    for (let batch = 1; batch < 100; batch += 1) {
      mockBackfillSubmissions.mockResolvedValueOnce(
        ApiResult.success({
          processed: 1,
          skipped: 0,
          failed: 0,
          hasMore: true,
          nextAfterSubmissionId: `s-${batch}`,
        }),
      );
    }

    const result = await prepareReportingExportAction("form-1");

    expect(mockBackfillSubmissions).toHaveBeenCalledTimes(100);
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("fails when submissions remain after the batch cap", async () => {
    mockBackfillSubmissions.mockResolvedValue(
      ApiResult.success({
        processed: 1,
        skipped: 0,
        failed: 0,
        hasMore: true,
        nextAfterSubmissionId: "next",
      }),
    );

    const result = await prepareReportingExportAction("form-1");

    expect(mockBackfillSubmissions).toHaveBeenCalledTimes(100);
    expect(Result.isError(result)).toBe(true);
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

  it("refuses a full recompile, calling nothing, when the user cannot edit forms", async () => {
    mockCheckPermission.mockResolvedValue(AuthorizationResult.forbidden());

    const result = await prepareReportingExportAction("form-1", {
      fullRecompile: true,
    });

    expect(mockCheckPermission).toHaveBeenCalledWith("forms.edit");
    expect(result).toMatchObject({ step: "refused" });
    expect(mockCompileSchema).not.toHaveBeenCalled();
    expect(mockBackfillSubmissions).not.toHaveBeenCalled();
  });

  it("says the check failed, not that permission is missing, when the check errors", async () => {
    mockCheckPermission.mockResolvedValue(AuthorizationResult.error());

    const result = await prepareReportingExportAction("form-1", {
      fullRecompile: true,
    });

    expect(Result.isError(result) && result.message).toBe(
      "Could not check permission to recompile reporting data.",
    );
    expect(mockCompileSchema).not.toHaveBeenCalled();
  });

  it("prepares without checking form edit when not recompiling", async () => {
    mockCheckPermission.mockResolvedValue(AuthorizationResult.forbidden());

    const result = await prepareReportingExportAction("form-1");

    expect(mockCheckPermission).not.toHaveBeenCalled();
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("identifies the failed compile and preserves its API support reference", async () => {
    // Arrange
    mockCompileSchema.mockResolvedValueOnce(
      ApiResult.networkError("Compile unavailable", { traceId: "api-ref" }),
    );

    // Act
    const result = await prepareReportingExportAction("form-1");

    // Assert
    expect(result).toMatchObject({ step: "compile", traceId: "api-ref" });
    expect(mockBackfillSubmissions).not.toHaveBeenCalled();
  });

  it.each([
    ["ReportingSchemaAliasConflict", true, "retained"],
    ["ReportingSchemaAliasConflict", false, "retained"],
    ["ReportingSchemaAliasConflict", "true", "retained"],
    ["OtherConflict", true, undefined],
  ])(
    "checks the rejected compile contract (%s, %s)",
    async (errorCode, available, expected) => {
      // Arrange
      const body = {
        status: 409,
        detail: "Column meanings conflict.",
        errorCode,
        previousSchemaRetained: true,
        previousExportAvailable: available,
      };
      mockCompileSchema.mockResolvedValueOnce(
        await mapResponseToApiError(Response.json(body, { status: 409 }), {}),
      );

      // Act
      const failure = await prepareReportingExportAction("form-1");

      // Assert
      expect(failure).toMatchObject({
        step: "compile",
        message: body.detail,
        previousSchema: expected,
      });
      expect(mockBackfillSubmissions).not.toHaveBeenCalled();
    },
  );

  it("reports completed batches before an interrupted backfill", async () => {
    // Arrange
    mockBackfillSubmissions.mockResolvedValueOnce(
      ApiResult.success({
        processed: 4,
        skipped: 1,
        failed: 0,
        hasMore: true,
        nextAfterSubmissionId: "7",
      }),
    );
    mockBackfillSubmissions.mockResolvedValueOnce(
      ApiResult.networkError("Backfill unavailable"),
    );

    // Act
    const failure = await prepareReportingExportAction("100", {
      fullRecompile: true,
    });

    // Assert
    expect(failure).toMatchObject({
      step: "backfill",
      message: expect.stringContaining("4 processed, 1 skipped, 0 failed"),
      traceId: expect.any(String),
    });
    expect(failure).not.toHaveProperty("previousSchema");
  });

  it("logs an unexpected compile failure as an error under its support reference", async () => {
    // Arrange
    mockCompileSchema.mockResolvedValueOnce(
      ApiResult.serverError("sentinel-compile-message", {
        statusCode: 500,
        traceId: "api-ref",
        details: "sentinel-private-details",
      }),
    );

    // Act
    const failure = await prepareReportingExportAction("form-1");

    // Assert
    expect(failure).toMatchObject({
      traceId: "api-ref",
      message: "sentinel-compile-message",
      details: "sentinel-private-details",
    });
    expect(telemetry.warn).not.toHaveBeenCalled();
    expect(telemetry.error).toHaveBeenCalledExactlyOnceWith(
      "Reporting export preparation failed",
      undefined,
      {
        formId: "form-1",
        step: "compile",
        traceId: "api-ref",
        statusCode: 500,
        errorCode: "server_error",
      },
      "export.prepare-reporting-export",
    );
  });

  it("logs an interrupted backfill under the reference it returns", async () => {
    // Arrange
    mockBackfillSubmissions.mockResolvedValueOnce(
      ApiResult.serverError("Backfill blew up", { statusCode: 500 }),
    );

    // Act
    const failure = await prepareReportingExportAction("form-1");

    // Assert
    const traceId = Result.isError(failure) ? failure.traceId : undefined;
    expect(traceId).toEqual(expect.any(String));
    expect(telemetry.error).toHaveBeenCalledExactlyOnceWith(
      "Reporting export preparation failed",
      undefined,
      {
        formId: "form-1",
        step: "backfill",
        traceId,
        statusCode: 500,
        errorCode: "server_error",
      },
      "export.prepare-reporting-export",
    );
  });

  it("logs only structured context for an expected conflict and returns its detail to the reader", async () => {
    // Arrange
    const body = {
      status: 409,
      detail: "Column meanings conflict.",
      errorCode: "ReportingSchemaAliasConflict",
      traceId: "conflict-ref",
    };
    mockCompileSchema.mockResolvedValueOnce(
      await mapResponseToApiError(Response.json(body, { status: 409 }), {}),
    );

    // Act
    const failure = await prepareReportingExportAction("form-1");

    // Assert
    expect(telemetry.error).not.toHaveBeenCalled();
    expect(failure).toMatchObject({ message: body.detail, traceId: body.traceId });
    expect(telemetry.warn).toHaveBeenCalledExactlyOnceWith(
      "Reporting export preparation failed",
      {
        formId: "form-1",
        step: "compile",
        traceId: "conflict-ref",
        statusCode: 409,
        errorCode: body.errorCode,
      },
      "export.prepare-reporting-export",
    );
  });
});
