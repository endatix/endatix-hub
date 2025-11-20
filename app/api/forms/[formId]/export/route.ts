import { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { exportSubmissions } from "@/services/api";

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
  const format = searchParams.get("format") || "csv";
  const exportId = searchParams.get("exportId");

  try {
    return await exportSubmissions(formId, format, exportId ? Number(exportId) : undefined);
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
