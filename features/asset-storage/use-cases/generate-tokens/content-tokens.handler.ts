import { NextRequest, NextResponse } from "next/server";
import { ContentTokenRequest, ContentUploadMetadata } from "../../types";
import { authorization, AuthorizationResult } from "@/features/auth";
import { createFormAccessService } from "@/features/auth/access-control";
import { buildContentFolderPath } from "../../infrastructure/storage-utils";
import { Result } from "@/lib/result";
import { getContainerNames } from "../../server";
import { ApiResult } from "@/lib/endatix-api";
import { executeTokenFlow, StorageContext } from "./token-flow";

export const contentTokensHandler = (req: NextRequest): Promise<NextResponse> =>
  executeTokenFlow<ContentTokenRequest, ContentUploadMetadata>(req, {
    getFileNames: (d) => d.fileNames,

    validate: (data) => {
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
    },

    authorize: async ({ session, data }) => {
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
    },

    resolveStorage: async ({
      data,
      session,
    }): Promise<
      ApiResult<StorageContext & { extra?: ContentUploadMetadata }>
    > => {
      const folderResult = buildContentFolderPath(data.itemType, data.itemId);
      if (Result.isError(folderResult)) {
        return ApiResult.validationError(folderResult.message);
      }

      const metadata: ContentUploadMetadata = {
        userId: session!.user?.id ?? "",
        itemId: data.itemId.trim(),
        contentItemType: data.itemType,
        questionName: data.questionName ?? "",
      };

      return ApiResult.success({
        containerName: getContainerNames().CONTENT,
        folderPath: folderResult.value,
        extra: metadata,
      });
    },
  });

export type ContentTokensHandlers = Record<
  "POST",
  (request: NextRequest) => Promise<NextResponse>
>;

export const contentTokensHandlers: ContentTokensHandlers = {
  POST: contentTokensHandler,
};
