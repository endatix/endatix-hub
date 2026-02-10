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

interface SASTokenRequest {
  formId: string;
  fileNames: string[];
  formLocale: string;
  submissionId: string;
}

interface SASOperationResult {
  success: boolean;
  message?: string;
  url?: string;
}

interface SASTokenResponse {
  sasTokens: Record<string, SASOperationResult>;
  submissionId: string;
  userId: string;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id ?? "anonymous";

  const data: SASTokenRequest = await request.json();
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
      "Generate submissionId for sas token generation",
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return apiResponses.badRequest({
        detail: initialSubmissionResult.error.message,
      });
    }

    submissionId = initialSubmissionResult.data.submissionId;
  }
  const sasTokens: Record<string, SASOperationResult> = {};

  const containerNames = getContainerNames();
  const containerName = containerNames.USER_FILES;

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      sasTokens[fileName] = failedResult(uniqueFileNameResult.message);
      continue;
    }

    const folderPathResult = buildUserFileFolderPath(formId, submissionId);
    if (Result.isError(folderPathResult)) {
      sasTokens[fileName] = failedResult(folderPathResult.message);
      continue;
    }

    try {
      const sasToken = await generateUploadUrl({
        containerName,
        folderPath: folderPathResult.value,
        fileName: uniqueFileNameResult.value,
      });
      sasTokens[fileName] = successResult(sasToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      sasTokens[fileName] = failedResult(errorMessage);
    }
  }

  const sasTokenResponse: SASTokenResponse = {
    sasTokens,
    submissionId,
    userId,
  };

  return Response.json(sasTokenResponse);
}

function successResult(url: string): SASOperationResult {
  return {
    success: true,
    url,
  };
}

function failedResult(message: string): SASOperationResult {
  return {
    success: false,
    message,
  };
}
