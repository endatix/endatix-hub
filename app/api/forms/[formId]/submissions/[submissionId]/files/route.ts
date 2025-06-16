import { NextRequest } from "next/server";
import { Model, Serializer } from "survey-core";
import { getSubmissionDetailsUseCase } from '@/features/submissions/use-cases/get-submission-details.use-case';
import { Result } from '@/lib/result';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> },
) {
  const { formId, submissionId } = await params;
  const submission = await getSubmissionDetailsUseCase({
    formId,
    submissionId,
  });

  if (Result.isError(submission) || !submission.value?.formDefinition) {
    return new Response("Submission not found", { status: 404 });
  }

  Serializer.addProperty("survey", {
    name: "fileNamesPrefix",
    category: "downloadSettings",
    displayName: "File names prefix",
    type: "expression",
    visibleIndex: 0,
  });

  const model = new Model(submission.value.formDefinition.jsonData);
  model.data = JSON.parse(submission.value.jsonData);

  const expression = model.getPropertyValue("fileNamesPrefix") ?? "";
  const prefix = model.runExpression(expression) ?? "";
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
