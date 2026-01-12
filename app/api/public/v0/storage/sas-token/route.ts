import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { CONTAINER_NAMES } from "@/features/storage/infrastructure/storage-config";
import { generateUploadUrl } from "@/features/storage/infrastructure/storage-service";
import { generateUniqueFileName } from "@/features/storage/utils";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

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
}

export async function POST(request: Request): Promise<Response> {
  const data: SASTokenRequest = await request.json();
  const { formId, fileNames, formLocale } = data;
  let submissionId = data.submissionId;

  if (!formId) {
    return Response.json({ error: "Form ID is required" }, { status: 400 });
  }

  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return Response.json({ error: "File names are required" }, { status: 400 });
  }

  if (!submissionId) {
    const initialSubmissionResult = await createInitialSubmissionUseCase(
      formId,
      formLocale,
      "Generate submissionId for sas token generation",
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return Response.json(
        { error: initialSubmissionResult.error.message },
        { status: 400 },
      );
    }

    submissionId = initialSubmissionResult.data.submissionId;
  }
  const sasTokens: Record<string, SASOperationResult> = {};

  const containerName = CONTAINER_NAMES.USER_FILES;

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      sasTokens[fileName] = {
        success: false,
        message: uniqueFileNameResult.message,
      };
      continue;
    }

    try {
      const sasToken = await generateUploadUrl({
        containerName,
        folderPath: `s/${formId}/${submissionId}`,
        fileName: uniqueFileNameResult.value,
      });
      sasTokens[fileName] = {
        success: true,
        url: sasToken,
      };
    } catch (error) {
      sasTokens[fileName] = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const sasTokenResponse: SASTokenResponse = {
    sasTokens,
    submissionId,
  };
  return Response.json(sasTokenResponse);
}
