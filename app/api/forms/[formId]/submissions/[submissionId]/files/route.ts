import { NextRequest } from "next/server";
import { Model, Serializer } from "survey-core";
import { buildSubmissionFilesZipFromStorage } from "@/features/submissions/use-cases/build-submission-files-zip-from-storage.use-case";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getClientStorageConfig } from "@/features/asset-storage/storage-runtime";
import { EMPTY_FILE_HEADER } from "@/lib/utils/files-download";
import { authorization, Permissions } from "@/features/auth";
import { auth } from "@/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> },
) {
  const { formId, submissionId } = await params;

  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);

  await requireHubAccess();

  const canViewSubmission = await checkPermission(Permissions.Submissions.View);
  if (!canViewSubmission.success) {
    return new Response("You are not authorized to view this submission", {
      status: 403,
    });
  }

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
  const downloadFileName = `submission-${submissionId}-files.zip`;

  if (!getClientStorageConfig().isEnabled) {
    return new Response("File storage is not enabled", { status: 503 });
  }

  const zipResult = await buildSubmissionFilesZipFromStorage({
    formId,
    submissionId,
    fileNamesPrefix: prefix,
    downloadFileName,
  });

  if (Result.isError(zipResult)) {
    return new Response(zipResult.message, { status: 500 });
  }

  if (zipResult.value.kind === "empty") {
    const headers: HeadersInit = {
      "content-type": "application/zip",
      [EMPTY_FILE_HEADER]: "true",
    };
    return new Response(new Uint8Array(), { status: 200, headers });
  }

  const headers: HeadersInit = {
    "content-type": "application/zip",
    "content-disposition": `attachment; filename=${downloadFileName}`,
  };
  const zipBytes = new Uint8Array(zipResult.value.buffer);
  return new Response(zipBytes, { status: 200, headers });
}
