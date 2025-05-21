import { NextRequest } from "next/server";
import { getSession } from "@/features/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } },
) {
  // Get the formId from params
  const formId = params.formId;

  // Get JWT token from server session
  const session = await getSession();
  const token = session?.accessToken;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get format parameter from query string
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") || "csv";

  const baseUrl = process.env.API_BASE_URL || "https://localhost:5001";
  const apiUrl = `${baseUrl}/api/forms/${formId}/submissions/export`;

  // Default content type based on format
  let contentType = "text/csv";
  let contentDisposition = `attachment; filename=form-${formId}-submissions.csv`;
  if (format === "json") contentType = "application/json";

  // Create a transform stream to handle the data flow
  const { readable, writable } = new TransformStream();

  // Process the API response in the background
  (async () => {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exportFormat: format,
        }),
      });

      if (!response.ok) {
        const writer = writable.getWriter();
        writer.write(
          new TextEncoder().encode(
            JSON.stringify({
              error: (await response.json()).Detail,
              status: response.status,
              statusText: response.statusText,
            }),
          ),
        );
        writer.close();
        return;
      }

      contentDisposition =
        response.headers.get("Content-Disposition") ||
        `attachment; filename=form-${formId}-submissions.csv`;
      const responseContentType = response.headers.get("Content-Type");
      if (responseContentType) {
        contentType = responseContentType;
      }

      // Pipe the response body directly to our writable stream
      if (response.body) {
        // This streams the response from the .NET API to our writable stream
        await response.body.pipeTo(writable);
      } else {
        // Handle case where response body is null (shouldn't happen)
        const writer = writable.getWriter();
        writer.write(new TextEncoder().encode("No data returned from API"));
        writer.close();
      }
    } catch (error) {
      const writer = writable.getWriter();
      writer.write(
        new TextEncoder().encode(
          JSON.stringify({
            error: "Failed to export data",
            message: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
      writer.close();
    }
  })();

  // Get content disposition from API response or create a default one

  // Return the readable stream to the client
  return new Response(readable, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
    },
  });
}
