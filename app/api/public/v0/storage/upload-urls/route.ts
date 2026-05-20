import { auth } from "@/auth";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import {
  createFormStorageGateService,
  mapGateResultToResponse,
  type FormStorageTokenType,
} from "@/features/form-access/server";
import { getContainerNames } from "@/features/asset-storage/server";
import { requireActiveStorageProvider } from "@/features/asset-storage/storage-runtime";
import { generateUniqueFileName } from "@/features/asset-storage";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import {
  buildUserFileFolderPath,
  buildUserFileMetadata,
} from "@/features/asset-storage/infrastructure/storage-utils";
import type { UploadUrlDescriptor } from "@/features/asset-storage/infrastructure/core";
import type { ProcessedState } from "@/features/asset-storage/types";
interface UploadUrlsRequest {
  formId: string;
  fileNames: string[];
  formLocale: string;
  submissionId?: string;
  token?: string;
  tokenType?: FormStorageTokenType;
  fileTypes?: Record<string, string>;
  fileStates?: Record<string, ProcessedState>;
  questionName?: string;
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

  let data: UploadUrlsRequest;
  try {
    data = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

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

  const accessResult = await createFormStorageGateService().authorizeRespondent(
    {
      formId,
      submissionId,
      token: data.token,
      tokenType: data.tokenType,
    },
    session,
    { allowCookieFallback: !session?.accessToken },
  );
  if (Result.isError(accessResult)) {
    return mapGateResultToResponse(accessResult)!;
  }

  if (!accessResult.value.canUploadFiles) {
    return apiResponses.forbidden({ detail: "File upload is not permitted" });
  }

  const effectiveSubmissionId = accessResult.value.submissionId ?? submissionId;
  const uploads: Record<string, UploadUrlEntry> = {};
  const containerNames = getContainerNames();
  const containerName = containerNames.USER_FILES;
  const folderPathResult = buildUserFileFolderPath(
    formId,
    effectiveSubmissionId,
  );
  if (Result.isError(folderPathResult)) {
    return apiResponses.badRequest({ detail: folderPathResult.message });
  }
  const folderPath = folderPathResult.value;

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      uploads[fileName] = { error: uniqueFileNameResult.message };
      continue;
    }

    try {
      const contentType =
        data.fileTypes?.[fileName] ?? "application/octet-stream";
      const fileState = data.fileStates?.[fileName];
      const blobUploadFileMetadata = buildUserFileMetadata({
        kind: "user",
        uploadedBy: userId,
        displayName: fileName,
        contentType,
        formId,
        submissionId: effectiveSubmissionId,
        formLang: data.formLocale,
        questionName: data.questionName ?? "",
      });

      if (fileState !== undefined) {
        blobUploadFileMetadata.fileState = fileState;
      }

      const descriptor = await requireActiveStorageProvider().generateUploadUrl(
        {
          containerName,
          folderPath,
          fileName: uniqueFileNameResult.value,
          blobUploadFileMetadata,
        },
      );
      uploads[fileName] = descriptor;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      uploads[fileName] = { error: errorMessage };
    }
  }

  const body: UploadUrlsResponse = {
    uploads,
    submissionId: effectiveSubmissionId,
    userId,
  };

  return Response.json(body);
}
