"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
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

  const settings = toResult(settingsResult, loadOptions);
  if (Result.isError(settings)) return settings;
  const folders = toResult(foldersResult, loadOptions);
  if (Result.isError(folders)) return folders;

  return Result.success({
    requireFolderAssignment: settings.value.requireFolderAssignment ?? false,
    folders: folders.value
      .filter((folder) => folder.isActive)
      .map(({ id, name }) => ({ id, name })),
  });
}
