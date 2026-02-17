import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  ContentTokenRequest,
  ContentTokenResponse,
  ContentUploadMetadata,
  TokenOperationResult,
  SubmissionTokenRequest,
  SubmissionTokenResponse,
} from "../../types";
import {
  authorization,
  AuthorizationResult,
  isAuthenticationRequired,
  isPermissionDenied,
} from "@/features/auth";
import { apiResponses } from "@/lib/utils/route-handlers";
import { createFormAccessService } from "@/features/auth/access-control";
import {
  buildContentFolderPath,
  buildUserFileFolderPath,
} from "../../infrastructure/storage-utils";
import { Result } from "@/lib/result";
import { generateUploadUrl, getContainerNames } from "../../server";
import { generateUniqueFileName } from "../../utils";
import { Session } from "next-auth";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { ApiResult } from "@/lib/endatix-api";

/**
 * Generates SAS tokens for uploading content to the hub storage.
 * @param request - The request containing the content item ID, type, file names, and question name.
 * @returns A response containing the SAS tokens and upload metadata.
 */

async function contentTokensHandler(
  request: NextRequest,
): Promise<NextResponse> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const data: ContentTokenRequest = await request.json();
  const { itemId, itemType, fileNames, questionName } = data;

  const validateRequest = validateContentTokenRequest(data);
  if (Result.isError(validateRequest)) {
    return apiResponses.badRequest({
      detail: validateRequest.message,
    });
  }

  const checkPermissionsResult = await checkContentOperationPermissions(
    session,
    itemId,
    itemType,
  );
  const { errorResponse } = handlePermissionError(checkPermissionsResult);
  if (errorResponse) {
    return errorResponse;
  }

  const folderPathResult = buildContentFolderPath(itemType, itemId);
  if (Result.isError(folderPathResult)) {
    return apiResponses.badRequest({
      detail: folderPathResult.message,
    });
  }

  const containerNames = getContainerNames();
  const containerName = containerNames.CONTENT;
  const folderPath = folderPathResult.value;
  const sasTokens: Record<string, TokenOperationResult> = {};

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
      const sasUrl = await generateUploadUrl({
        containerName,
        folderPath,
        fileName: uniqueFileNameResult.value,
      });
      sasTokens[fileName] = { success: true, url: sasUrl };
    } catch (error) {
      sasTokens[fileName] = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const uploadMetadata: ContentUploadMetadata = {
    userId: session!.user?.id ?? "",
    itemId: itemId.trim(),
    contentItemType: itemType,
    questionName: questionName ?? "",
  };

  const body: ContentTokenResponse = { tokens: sasTokens, uploadMetadata };

  return NextResponse.json(body);
}

/**
 * Handles the permission error.
 * @param checkPermissionsResult - The authorization result.
 * @returns A next response or void.
 */
function handlePermissionError(checkPermissionsResult: AuthorizationResult): {
  isSuccess: boolean;
  errorResponse: NextResponse | undefined;
} {
  if (AuthorizationResult.isSuccess(checkPermissionsResult)) {
    return { isSuccess: true, errorResponse: undefined };
  }

  const checkPermissionError = checkPermissionsResult.error;
  if (isPermissionDenied(checkPermissionsResult)) {
    return {
      isSuccess: false,
      errorResponse: apiResponses.forbidden({
        detail: checkPermissionError.message,
      }),
    };
  }

  if (isAuthenticationRequired(checkPermissionsResult)) {
    return {
      isSuccess: false,
      errorResponse: apiResponses.unauthorized({
        detail: checkPermissionError.message,
      }),
    };
  }

  return {
    isSuccess: true,
    errorResponse: undefined,
  };
}

/**
 * Validates the content token request.
 * @param data - The content token request data.
 * @returns A result containing the validation result.
 */
function validateContentTokenRequest(
  data: ContentTokenRequest,
): Result<boolean> {
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
}

/**
 * Checks the permissions for the content operation.
 * @param session - The session.
 * @param itemId - The item ID.
 * @param itemType - The item type.
 * Note: For template content, no granularpermissions are checked at this time. Main check is hub access.
 * @returns An authorization result.
 */
async function checkContentOperationPermissions(
  session: Session | null,
  itemId: string,
  itemType: string,
): Promise<AuthorizationResult> {
  if (itemType === "template") {
    return AuthorizationResult.success();
  }

  const access = await createFormAccessService({ formId: itemId, session });

  if (!access.canDesignForm()) {
    return AuthorizationResult.forbidden(
      "You do not have permission to upload form content",
    );
  }

  return AuthorizationResult.success();
}

/**
 * Generates SAS tokens for uploading submission files (user files) to the storage.
 * @param request - The request containing the form ID, file names, and optional submission ID.
 * @returns A response containing the SAS tokens and submission ID.
 */
async function submissionTokensHandler(
  request: NextRequest,
): Promise<NextResponse> {
  const session = await auth();

  const data: SubmissionTokenRequest = await request.json();
  const { formId, fileNames, formLocale } = data;
  let { submissionId: submissionId } = data;

  const validateRequest = validateSubmissionTokenRequest(data);
  if (Result.isError(validateRequest)) {
    return apiResponses.badRequest({
      detail: validateRequest.message,
    });
  }

  const access = await createFormAccessService({
    formId,
    submissionId,
    session,
  });

  if (!access.canUploadFile()) {
    return apiResponses.forbidden({
      detail: "You do not have permission to upload files",
    });
  }

  const userId = session?.user?.id ?? "anonymous";

  if (!submissionId) {
    const initialSubmissionResult = await createInitialSubmissionUseCase(
      formId,
      formLocale ?? null,
      "Generate submissionId for sas token generation",
    );

    if (ApiResult.isError(initialSubmissionResult)) {
      return apiResponses.badRequest({
        detail: initialSubmissionResult.error.message,
      });
    }

    submissionId = initialSubmissionResult.data.submissionId;
  }

  const containerNames = getContainerNames();
  const containerName = containerNames.USER_FILES;
  const sasTokens: Record<string, TokenOperationResult> = {};

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      sasTokens[fileName] = {
        success: false,
        message: uniqueFileNameResult.message,
      };
      continue;
    }

    const folderPathResult = buildUserFileFolderPath(formId, submissionId);
    if (Result.isError(folderPathResult)) {
      sasTokens[fileName] = {
        success: false,
        message: folderPathResult.message,
      };
      continue;
    }

    try {
      const sasUrl = await generateUploadUrl({
        containerName,
        folderPath: folderPathResult.value,
        fileName: uniqueFileNameResult.value,
      });
      sasTokens[fileName] = { success: true, url: sasUrl };
    } catch (error) {
      sasTokens[fileName] = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const body: SubmissionTokenResponse = {
    tokens: sasTokens,
    submissionId,
    userId,
  };

  return NextResponse.json(body);
}

function validateSubmissionTokenRequest(
  data: SubmissionTokenRequest,
): Result<boolean> {
  const { formId, fileNames } = data;
  if (!formId) {
    return Result.validationError("Form ID is required");
  }
  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return Result.validationError("File names are required");
  }

  return Result.success(true);
}

export type ContentTokensHandlers = Record<
  "POST",
  (request: NextRequest) => Promise<NextResponse>
>;

/**
 * The route handler for generating content tokens.
 */
export const contentTokensHandlers: ContentTokensHandlers = {
  POST: contentTokensHandler,
};

export type SubmissionTokensHandlers = Record<
  "POST",
  (request: NextRequest) => Promise<NextResponse>
>;

/**
 * The route handler for generating submission (user file) tokens.
 */
export const submissionTokensHandlers: SubmissionTokensHandlers = {
  POST: submissionTokensHandler,
};
