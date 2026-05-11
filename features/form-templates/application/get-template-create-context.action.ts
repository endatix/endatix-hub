"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

type TemplateCreateContext = {
  requireFolderAssignment: boolean;
  folders: { id: string; name: string }[];
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

  const requireFolderAssignment =
    settingsResult.success &&
    (settingsResult.data.requireFolderAssignment ?? false);

  const folders = foldersResult.success
    ? foldersResult.data
        .filter((folder) => folder.isActive)
        .map((folder) => ({ id: folder.id, name: folder.name }))
    : [];

  return Result.success({
    requireFolderAssignment,
    folders,
  });
}
