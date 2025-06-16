import { NextRequest } from "next/server";
import { Model } from "survey-core";
import { getSubmission, getFormDefinition } from "@/services/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> },
) {
  const { formId, submissionId } = await params;

  // 1. Fetch submission and form definition
  const submission = await getSubmission(formId, submissionId);
  const formDefinition = await getFormDefinition(
    formId,
    submission.formDefinitionId,
  );

  // 2. Instantiate survey model
  const model = new Model(formDefinition.jsonData);

  // 3. Populate with submission data
  model.data = JSON.parse(submission.jsonData);

  // 4. Evaluate the prefix expression (hard-coded for now)
  const expression = "{refNumber} + '-' + {gender} + '-' + {age}";
  const prefix = model.runExpression(expression) ?? "";

  // 5. Proxy the request, passing the prefix as a query param
  const backendUrl = `${
    process.env.ENDATIX_BASE_URL || ""
  }/api/forms/${formId}/submissions/${submissionId}/files?fileNamesPrefix=${encodeURIComponent(
    prefix,
  )}`;

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
