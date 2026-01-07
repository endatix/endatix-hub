import { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { ExportOptions, exportSubmissions } from "@/services/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const session = await getSession();

  if (!session.isLoggedIn) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format");
  const exportId = searchParams.get("exportId");
  const exportOptions: ExportOptions = {
    formId,
    format: format ?? undefined,
    exportId: exportId ?? undefined,
  };

  try {
    return await exportSubmissions(exportOptions);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Export failed",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
