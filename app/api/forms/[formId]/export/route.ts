import { NextRequest } from "next/server";
import {
  ApiResult,
  EndatixApi,
  ExportSubmissionsRequest,
} from "@/lib/endatix-api";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import {
  parseCompletionStatusQuery,
  parseIncludeTestSubmissionsQuery,
  parseLegacyExportFormat,
  parseOptionalIsoDateQuery,
  parseOptionalLocaleQuery,
  parseOptionalPositiveIdQuery,
  parseReportingExportFormat,
} from "@/features/export/export-submissions";
import { isCodebookFormatKey } from "@/features/export/export-url";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";

function badRequest(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const session = await auth();

  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format");
  const exportFormatId = searchParams.get("exportFormatId");
  const exportId = searchParams.get("exportId");
  const includeTestSubmissionsParam = searchParams.get(
    "includeTestSubmissions",
  );

  const useReportingExport = await reportingExportFlag();

  if (useReportingExport && !exportFormatId) {
    return badRequest("exportFormatId is required for reporting export.");
  }

  let validatedExportFormatId: string | undefined;
  if (exportFormatId) {
    const exportFormatIdResult = validateEndatixId(
      exportFormatId,
      "exportFormatId",
    );
    if (Result.isError(exportFormatIdResult)) {
      return badRequest(exportFormatIdResult.message);
    }
    validatedExportFormatId = exportFormatIdResult.value;
  }

  let validatedExportId: string | undefined;
  if (!useReportingExport && exportId) {
    const exportIdResult = validateEndatixId(exportId, "exportId");
    if (Result.isError(exportIdResult)) {
      return badRequest(exportIdResult.message);
    }
    validatedExportId = exportIdResult.value;
  }

  const exportFormat = useReportingExport
    ? parseReportingExportFormat(format)
    : parseLegacyExportFormat(format);

  const formatKey = exportFormat ?? format ?? "";
  const isCodebook = isCodebookFormatKey(formatKey);

  const exportOptions: ExportSubmissionsRequest = {
    formId,
    exportFormat,
    exportFormatId: validatedExportFormatId,
    exportId: validatedExportId,
  };

  // Codebook exports accept a label locale (native + Shoji).
  if (isCodebook) {
    exportOptions.locale = parseOptionalLocaleQuery(searchParams.get("locale"));
  }

  if (!isCodebook) {
    exportOptions.includeTestSubmissions = parseIncludeTestSubmissionsQuery(
      includeTestSubmissionsParam,
    );
    exportOptions.createdAfter = parseOptionalIsoDateQuery(
      searchParams.get("createdAfter"),
    );
    exportOptions.createdBefore = parseOptionalIsoDateQuery(
      searchParams.get("createdBefore"),
    );
    exportOptions.startedAfter = parseOptionalIsoDateQuery(
      searchParams.get("startedAfter"),
    );
    exportOptions.startedBefore = parseOptionalIsoDateQuery(
      searchParams.get("startedBefore"),
    );
    exportOptions.completedAfter = parseOptionalIsoDateQuery(
      searchParams.get("completedAfter"),
    );
    exportOptions.completedBefore = parseOptionalIsoDateQuery(
      searchParams.get("completedBefore"),
    );
    exportOptions.minSubmissionId = parseOptionalPositiveIdQuery(
      searchParams.get("minSubmissionId"),
    );
    exportOptions.maxSubmissionId = parseOptionalPositiveIdQuery(
      searchParams.get("maxSubmissionId"),
    );
    exportOptions.completionStatus = parseCompletionStatusQuery(
      searchParams.get("completionStatus"),
    );
  }

  const endatix = new EndatixApi(session?.accessToken);
  const exportResult = await endatix.submissions.export(exportOptions);
  if (ApiResult.isError(exportResult)) {
    return new Response(
      JSON.stringify({
        error: exportResult.error.message,
      }),
      {
        status: exportResult.error.details?.statusCode ?? 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const response = exportResult.data;
  const contentType =
    response.headers.get("Content-Type") ?? "application/octet-stream";
  const contentDisposition =
    response.headers.get("Content-Disposition") ?? "attachment";

  if (!contentType || !contentDisposition) {
    return new Response(
      JSON.stringify({
        error: "Content type or content disposition not found",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(exportResult.data.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
    },
  });
}
