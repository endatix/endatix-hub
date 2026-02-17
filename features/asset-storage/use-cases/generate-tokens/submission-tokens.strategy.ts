import { Result } from "@/lib/result";
import { SubmissionTokenRequest, SubmissionTokenResponse } from "../../types";
import { AuthorizationResult } from "@/features/auth";
import { createFormAccessService } from "@/features/auth/access-control";
import { buildUserFileFolderPath } from "../../infrastructure/storage-utils";
import { getContainerNames } from "../../server";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { ApiResult } from "@/lib/endatix-api";
import { TokenContext, StorageContext, TokenStrategy } from "./types";

export const submissionTokensValidate = (data: SubmissionTokenRequest): Result<boolean> => {
  const { formId, fileNames } = data;
  if (!formId) {
    return Result.validationError("Form ID is required");
  }

  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return Result.validationError("File names are required");
  }

  return Result.success(true);
};

export const submissionTokensAuthorize = async ({
  session,
  data,
}: TokenContext<SubmissionTokenRequest>): Promise<AuthorizationResult> => {
  const accessService = await createFormAccessService({
    formId: data.formId,
    submissionId: data.submissionId,
    session,
  });

  if (!accessService.canUploadFile()) {
    return AuthorizationResult.forbidden(
      "You do not have permission to upload files",
    );
  }

  return AuthorizationResult.success();
};

export const submissionTokensResolveStorage = async ({
  data,
  session,
}: TokenContext<SubmissionTokenRequest>): Promise<ApiResult<StorageContext & { extra?: SubmissionTokenResponse }>> => {
  let submissionId = data.submissionId;

  if (!submissionId) {
    const initResult = await createInitialSubmissionUseCase(
      data.formId,
      data.formLocale ?? null,
      "Generate submissionId for sas token generation",
    );
    if (ApiResult.isError(initResult)) {
      return initResult;
    }
    submissionId = initResult.data.submissionId;
  }

  const folderResult = buildUserFileFolderPath(data.formId, submissionId);
  if (Result.isError(folderResult)) {
    return ApiResult.validationError(folderResult.message);
  }

  return ApiResult.success({
    containerName: getContainerNames().USER_FILES,
    folderPath: folderResult.value,
    extra: {
      submissionId,
      userId: session?.user?.id ?? "anonymous",
    } as SubmissionTokenResponse,
  });
};

export const submissionTokensStrategy: TokenStrategy<SubmissionTokenRequest, SubmissionTokenResponse> = {
  validate: submissionTokensValidate,
  authorize: submissionTokensAuthorize,
  resolveStorage: submissionTokensResolveStorage,
  getFileNames: (data) => data.fileNames,
};
