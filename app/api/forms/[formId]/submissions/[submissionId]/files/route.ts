import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> },
) {
  const { formId, submissionId } = await params;

  // Construct backend URL
  const backendUrl = `${
    process.env.ENDATIX_BASE_URL || ""
  }/api/forms/${formId}/submissions/${submissionId}/files`;

  console.log("backendUrl", backendUrl);

  try {
    const backendRes = await fetch(backendUrl, {
      method: "GET",
      headers: {
        // Forward cookies or auth headers if needed
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie")! }
          : {}),
      },
    });

    if (!backendRes.ok) {
      return new Response("File not found", { status: 404 });
    }

    // Stream the response
    const contentType =
      backendRes.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = backendRes.headers.get("content-disposition");
    const headers: HeadersInit = { "content-type": contentType };
    if (contentDisposition) headers["content-disposition"] = contentDisposition;

    return new Response(backendRes.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Failed to proxy file download", { status: 500 });
  }
}
