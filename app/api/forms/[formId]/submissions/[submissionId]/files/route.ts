import { NextRequest } from "next/server";
import { Model, Serializer } from "survey-core";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { EMPTY_FILE_HEADER } from "@/lib/utils/files-download";
import { getSubmissionFiles } from "@/services/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> },
) {
  const { formId, submissionId } = await params;
  const submission = await getSubmissionDetailsUseCase({
    formId,
    submissionId,
  });

  const activeDefinition = await getActiveDefinitionUseCase({
    formId,
  });

  if (Result.isError(submission) || Result.isError(activeDefinition)) {
    return new Response("Submission not found", { status: 404 });
  }

  Serializer.addProperty("survey", {
    name: "fileNamesPrefix",
    category: "downloadSettings",
    displayName: "File names prefix",
    type: "expression",
    visibleIndex: 0,
  });

  const model = new Model(activeDefinition.value.jsonData);
  model.data = JSON.parse(submission.value.jsonData);

  const expression = model.getPropertyValue("fileNamesPrefix") ?? "";
  const prefix = model.runExpression(expression) ?? "";

  try {
    const response = await getSubmissionFiles(formId, submissionId, prefix);

    // Stream the response
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");
    const headers: HeadersInit = { "content-type": contentType };
    if (contentDisposition) {
      headers["content-disposition"] = contentDisposition;
    }
    const emptyFile = response.headers.get(EMPTY_FILE_HEADER);
    if (emptyFile) {
      headers[EMPTY_FILE_HEADER] = emptyFile;
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Failed to proxy file download", { status: 500 });
  }
}
