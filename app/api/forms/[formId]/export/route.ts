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
  parseIncludeTestSubmissionsQuery,
  parseLegacyExportFormat,
  parseReportingExportWireKey,
} from "@/features/export/export-submissions";

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
    return new Response(
      JSON.stringify({
        error: "exportFormatId is required for reporting export.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const exportFormat = useReportingExport
    ? parseReportingExportWireKey(format)
    : parseLegacyExportFormat(format);

  const exportOptions: ExportSubmissionsRequest = {
    formId,
    exportFormat,
    exportFormatId: exportFormatId ?? undefined,
    exportId: useReportingExport ? undefined : (exportId ?? undefined),
    includeTestSubmissions: parseIncludeTestSubmissionsQuery(
      includeTestSubmissionsParam,
    ),
  };

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
