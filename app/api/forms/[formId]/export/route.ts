import { NextRequest } from "next/server";
import { EndatixApi, ExportSubmissionsRequest } from "@/lib/endatix-api";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import {
  parseLegacyExportFormat,
  parseOptionalLocaleQuery,
  parseReportingExportFormat,
  parseSubmissionRowExportQuery,
} from "@/features/export/export-submissions";
import { isCodebookFormatKey } from "@/lib/endatix-api/reporting/reporting-export-wire";
import { Result } from "@/lib/result";
import { toUpstreamFileResponse } from "@/lib/utils/route-handlers";
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
    Object.assign(exportOptions, parseSubmissionRowExportQuery(searchParams));
  }

  const endatix = new EndatixApi(session?.accessToken);
  const exportResult = await endatix.submissions.export(exportOptions);
  return toUpstreamFileResponse(exportResult);
}
