"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import {
  ApiErrorType,
  type ApiError,
  type ApiResult,
} from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";

export type TemplateCreateContext = {
  requireFolderAssignment: boolean;
  folders: { id: string; name: string }[];
};

const loadOptions = {
  fallbackMessage: "Failed to load template creation settings.",
  logMessage: "Failed to load template creation settings or folders.",
  loggerName: "form-templates",
};

function refusalPriority({ error }: ApiError) {
  if (error.type === ApiErrorType.AuthError) return 3;
  if (error.type !== ApiErrorType.ForbiddenError) return 0;
  return error.details?.requiredAction ? 1 : 2;
}

function contextFailure(first: ApiError, other: ApiResult<unknown>) {
  const failure =
    !other.success && refusalPriority(other) > refusalPriority(first)
      ? other
      : first;
  return toResult<TemplateCreateContext>(failure, loadOptions);
}

export async function getTemplateCreateContextAction(): Promise<
  Result<TemplateCreateContext>
> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const [settingsResult, foldersResult] = await Promise.all([
    api.tenant.getSettings(),
    api.folders.list(),
  ]);

  if (!settingsResult.success) return contextFailure(settingsResult, foldersResult);
  if (!foldersResult.success) return toResult<TemplateCreateContext>(foldersResult, loadOptions);

  return Result.success({
    requireFolderAssignment:
      settingsResult.data.requireFolderAssignment ?? false,
    folders: foldersResult.data
      .filter((folder) => folder.isActive)
      .map(({ id, name }) => ({ id, name })),
  });
}
