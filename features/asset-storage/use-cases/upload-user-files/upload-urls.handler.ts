import { auth } from "@/auth";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import {
  createFormStorageGateService,
  mapGateResultToResponse,
  type FormStorageTokenType,
} from "@/features/form-access/server";
import { generateUniqueFileName } from "@/features/asset-storage";
import { getContainerNames } from "@/features/asset-storage/server";
import {
  buildUserFileFolderPath,
  buildUserFileMetadata,
} from "@/features/asset-storage/infrastructure/storage-utils";
import { requireActiveStorageProvider } from "@/features/asset-storage/storage-runtime";
import type { UploadUrlDescriptor } from "@/features/asset-storage/infrastructure/core";
import type { ProcessedState } from "@/features/asset-storage/types";
import { ApiResult } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import type { Session } from "next-auth";

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

interface AuthorizedUploadRequest {
  data: UploadUrlsRequest;
  effectiveSubmissionId: string;
  userId: string;
}

interface GenerateUploadDescriptorOptions {
  containerName: string;
  data: UploadUrlsRequest;
  effectiveSubmissionId: string;
  fileName: string;
  folderPath: string;
  userId: string;
}

type HandlerStepResult<T> =
  | { success: true; value: T }
  | { success: false; response: Response };

export type UserFileUploadUrlsHandlers = Record<
  "POST",
  (request: Request) => Promise<Response>
>;

export class UserFileUploadUrlsHandler {
  async handle(request: Request, session: Session | null): Promise<Response> {
    const dataResult = await this.readRequest(request);
    if (Result.isError(dataResult)) {
      return apiResponses.badRequest({ detail: dataResult.message });
    }

    const data = dataResult.value;
    const validationResponse = this.validateRequest(data);
    if (validationResponse !== null) {
      return validationResponse;
    }

    const authorizedResult = await this.authorizeUpload(data, session);
    if (!authorizedResult.success) {
      return authorizedResult.response;
    }

    const folderPathResult = this.resolveFolderPath(authorizedResult.value);
    if (Result.isError(folderPathResult)) {
      return apiResponses.badRequest({ detail: folderPathResult.message });
    }

    const response = await this.generateUploadUrls(
      authorizedResult.value,
      folderPathResult.value,
    );

    return Response.json(response);
  }

  private async readRequest(
    request: Request,
  ): Promise<Result<UploadUrlsRequest>> {
    try {
      const data = (await request.json()) as UploadUrlsRequest;
      return Result.success(data);
    } catch {
      return Result.error("Invalid JSON body");
    }
  }

  private validateRequest(data: UploadUrlsRequest): Response | null {
    if (!data.formId) {
      return apiResponses.badRequest({ detail: "Form ID is required" });
    }

    if (!Array.isArray(data.fileNames) || data.fileNames.length === 0) {
      return apiResponses.badRequest({ detail: "File names are required" });
    }

    return null;
  }

  private async authorizeUpload(
    data: UploadUrlsRequest,
    session: Session | null,
  ): Promise<HandlerStepResult<AuthorizedUploadRequest>> {
    const submissionIdResult = await this.resolveSubmissionId(data);
    if (Result.isError(submissionIdResult)) {
      return {
        success: false,
        response: apiResponses.badRequest({
          detail: submissionIdResult.message,
        }),
      };
    }

    const accessResult =
      await createFormStorageGateService().authorizeRespondent(
        {
          formId: data.formId,
          submissionId: submissionIdResult.value,
          token: data.token,
          tokenType: data.tokenType,
        },
        session,
        { allowCookieFallback: !session?.accessToken },
      );

    if (Result.isError(accessResult)) {
      return {
        success: false,
        response: mapGateResultToResponse(accessResult)!,
      };
    }

    if (!accessResult.value.canUploadFiles) {
      return {
        success: false,
        response: apiResponses.forbidden({
          detail: "File upload is not permitted",
        }),
      };
    }

    return {
      success: true,
      value: {
        data,
        effectiveSubmissionId:
          accessResult.value.submissionId ?? submissionIdResult.value,
        userId: session?.user?.id ?? "anonymous",
      },
    };
  }

  private async resolveSubmissionId(
    data: UploadUrlsRequest,
  ): Promise<Result<string>> {
    if (data.submissionId) {
      return Result.success(data.submissionId);
    }

    const initialSubmissionResult = await createInitialSubmissionUseCase(
      data.formId,
      data.formLocale,
      "Generate submissionId for upload URL generation",
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return Result.error(initialSubmissionResult.error.message);
    }

    return Result.success(initialSubmissionResult.data.submissionId);
  }

  private resolveFolderPath(request: AuthorizedUploadRequest): Result<string> {
    return buildUserFileFolderPath(
      request.data.formId,
      request.effectiveSubmissionId,
    );
  }

  private async generateUploadUrls(
    request: AuthorizedUploadRequest,
    folderPath: string,
  ): Promise<UploadUrlsResponse> {
    const containerName = getContainerNames().USER_FILES;
    const uploads: Record<string, UploadUrlEntry> = {};

    for (const fileName of request.data.fileNames) {
      uploads[fileName] = await this.generateUploadDescriptor({
        containerName,
        data: request.data,
        effectiveSubmissionId: request.effectiveSubmissionId,
        fileName,
        folderPath,
        userId: request.userId,
      });
    }

    return {
      uploads,
      submissionId: request.effectiveSubmissionId,
      userId: request.userId,
    };
  }

  private async generateUploadDescriptor({
    containerName,
    data,
    effectiveSubmissionId,
    fileName,
    folderPath,
    userId,
  }: GenerateUploadDescriptorOptions): Promise<UploadUrlEntry> {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      return { error: uniqueFileNameResult.message };
    }

    try {
      const blobUploadFileMetadata = buildUserFileMetadata({
        kind: "user",
        uploadedBy: userId,
        displayName: fileName,
        contentType: data.fileTypes?.[fileName] ?? "application/octet-stream",
        formId: data.formId,
        submissionId: effectiveSubmissionId,
        formLang: data.formLocale,
        questionName: data.questionName ?? "",
      });

      const fileState = data.fileStates?.[fileName];
      if (fileState !== undefined) {
        blobUploadFileMetadata.fileState = fileState;
      }

      return await requireActiveStorageProvider().generateUploadUrl({
        containerName,
        folderPath,
        fileName: uniqueFileNameResult.value,
        blobUploadFileMetadata,
      });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

const userFileUploadUrlsHandler = new UserFileUploadUrlsHandler();

async function userFileUploadUrlsPostHandler(
  request: Request,
): Promise<Response> {
  const session = await auth();
  return userFileUploadUrlsHandler.handle(request, session);
}

export const userFileUploadUrlsHandlers: UserFileUploadUrlsHandlers = {
  POST: userFileUploadUrlsPostHandler,
};
