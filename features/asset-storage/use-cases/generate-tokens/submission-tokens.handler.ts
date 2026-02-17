import { NextRequest, NextResponse } from "next/server";
import { SubmissionTokenRequest, SubmissionTokenResponse } from "../../types";
import { AuthorizationResult } from "@/features/auth";
import { createFormAccessService } from "@/features/auth/access-control";
import { buildUserFileFolderPath } from "../../infrastructure/storage-utils";
import { Result } from "@/lib/result";
import { getContainerNames } from "../../server";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { ApiResult } from "@/lib/endatix-api";
import { executeTokenFlow, StorageContext } from "./token-flow";

export const submissionTokensHandler = (
  req: NextRequest,
): Promise<NextResponse> =>
  executeTokenFlow<SubmissionTokenRequest, SubmissionTokenResponse>(req, {
    getFileNames: (d) => d.fileNames,

    validate: (data) => {
      const { formId, fileNames } = data;
      if (!formId) {
        return Result.validationError("Form ID is required");
      }

      if (!Array.isArray(fileNames) || fileNames.length === 0) {
        return Result.validationError("File names are required");
      }

      return Result.success(true);
    },

    authorize: async ({ session, data }) => {
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
    },

    resolveStorage: async ({
      data,
      session,
    }): Promise<
      ApiResult<StorageContext & { extra?: SubmissionTokenResponse }>
    > => {
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
    },
  });

export type SubmissionTokensHandlers = Record<
  "POST",
  (request: NextRequest) => Promise<NextResponse>
>;

export const submissionTokensHandlers: SubmissionTokensHandlers = {
  POST: submissionTokensHandler,
};
