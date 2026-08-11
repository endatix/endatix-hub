import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListExportFormat } from "@/lib/endatix-api/data-lists/types";
import { toUpstreamFileResponse } from "@/lib/utils/route-handlers";

function parseExportFormat(value: string | null): DataListExportFormat {
  return value === "json" ? "json" : "csv";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataListId: string }> },
) {
  const { dataListId } = await params;
  const session = await auth();

  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const format = parseExportFormat(request.nextUrl.searchParams.get("format"));
  const api = new EndatixApi(session?.accessToken);
  const exportResult = await api.dataLists.export(dataListId, format);

  return toUpstreamFileResponse(exportResult, {
    fallbackContentType:
      format === "json"
        ? "application/json; charset=utf-8"
        : "text/csv; charset=utf-8",
    fallbackContentDisposition: `attachment; filename="${
      format === "json"
        ? `data-list-${dataListId}.json`
        : `data-list-${dataListId}-translations.csv`
    }"`,
  });
}
