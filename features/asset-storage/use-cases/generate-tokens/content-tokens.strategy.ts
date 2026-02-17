import { Result } from "@/lib/result";
import { ApiResult } from "@/lib/endatix-api";
import { ContentTokenRequest, ContentUploadMetadata } from "../../types";
import { AuthorizationResult, authorization } from "@/features/auth";
import { createFormAccessService } from "@/features/auth/access-control";
import { buildContentFolderPath } from "../../infrastructure/storage-utils";
import { getContainerNames } from "../../server";
import { StorageContext, TokenContext, TokenStrategy } from "./types";

export const contentTokensValidate = (
  data: ContentTokenRequest,
): Result<boolean> => {
  const { itemId, itemType, fileNames } = data;
  if (!itemId?.trim()) {
    return Result.validationError("Item ID is required");
  }

  if (!itemType) {
    return Result.validationError("Item type is required");
  }

  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return Result.validationError("File names are required");
  }

  return Result.success(true);
};

export const contentTokensAuthorize = async ({
  session,
  data,
}: TokenContext<ContentTokenRequest>): Promise<AuthorizationResult> => {
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  if (data.itemType === "template") {
    return AuthorizationResult.success();
  }

  const access = await createFormAccessService({
    formId: data.itemId,
    session,
  });

  if (!access.canDesignForm()) {
    return AuthorizationResult.forbidden(
      "You do not have permission to upload form content",
    );
  }
  return AuthorizationResult.success();
};

export const contentTokensResolveStorage = async ({
  data,
  session,
}: TokenContext<ContentTokenRequest>): Promise<
  ApiResult<StorageContext & { extra?: ContentUploadMetadata }>
> => {
  const folderResult = buildContentFolderPath(data.itemType, data.itemId);
  if (Result.isError(folderResult)) {
    return ApiResult.validationError(folderResult.message);
  }

  const metadata: ContentUploadMetadata = {
    userId: session?.user?.id ?? "",
    itemId: data.itemId.trim(),
    contentItemType: data.itemType,
    questionName: data.questionName ?? "",
  };

  return ApiResult.success({
    containerName: getContainerNames().CONTENT,
    folderPath: folderResult.value,
    extra: metadata,
  });
};

export const contentTokensStrategy: TokenStrategy<
  ContentTokenRequest,
  ContentUploadMetadata
> = {
  validate: contentTokensValidate,
  authorize: contentTokensAuthorize,
  resolveStorage: contentTokensResolveStorage,
  getFileNames: (data) => data.fileNames,
};
