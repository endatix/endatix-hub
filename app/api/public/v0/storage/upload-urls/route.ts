import { auth } from "@/auth";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import {
  getContainerNames,
  generateUploadUrl,
} from "@/features/asset-storage/server";
import { generateUniqueFileName } from "@/features/asset-storage";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { buildUserFileFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
import type { UploadUrlDescriptor } from "@/features/asset-storage/infrastructure/storage-gateway";

interface UploadUrlsRequest {
  formId: string;
  fileNames: string[];
  formLocale: string;
  submissionId: string;
}

export type UploadUrlEntry = UploadUrlDescriptor | { error: string };

export interface UploadUrlsResponse {
  uploads: Record<string, UploadUrlEntry>;
  submissionId: string;
  userId: string;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id ?? "anonymous";

  const data: UploadUrlsRequest = await request.json();
  const { formId, fileNames, formLocale } = data;
  let submissionId = data.submissionId;

  if (!formId) {
    return apiResponses.badRequest({ detail: "Form ID is required" });
  }

  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return apiResponses.badRequest({ detail: "File names are required" });
  }

  if (!submissionId) {
    const initialSubmissionResult = await createInitialSubmissionUseCase(
      formId,
      formLocale,
      "Generate submissionId for upload URL generation",
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return apiResponses.badRequest({
        detail: initialSubmissionResult.error.message,
      });
    }

    submissionId = initialSubmissionResult.data.submissionId;
  }
  const uploads: Record<string, UploadUrlEntry> = {};

  const containerNames = getContainerNames();
  const containerName = containerNames.USER_FILES;

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      uploads[fileName] = { error: uniqueFileNameResult.message };
      continue;
    }

    const folderPathResult = buildUserFileFolderPath(formId, submissionId);
    if (Result.isError(folderPathResult)) {
      uploads[fileName] = { error: folderPathResult.message };
      continue;
    }

    try {
      const descriptor = await generateUploadUrl({
        containerName,
        folderPath: folderPathResult.value,
        fileName: uniqueFileNameResult.value,
      });
      uploads[fileName] = descriptor;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      uploads[fileName] = { error: errorMessage };
    }
  }

  const body: UploadUrlsResponse = {
    uploads,
    submissionId,
    userId,
  };

  return Response.json(body);
}
