import { withWorkspaceSetupEntry } from "@/features/onboarding/server";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { CreateFolderDialog } from "@/features/folders/create-folder";
import { FolderNavigationCards } from "@/features/folders/list-folders";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { EndatixApi } from "@/lib/endatix-api";
import { toApiPageError } from "@/lib/errors/page-error";
import { resolvePageError } from "@/lib/errors/resolve-page-error";
import { Result, toResult } from "@/lib/result";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FolderOpen } from "lucide-react";

export default async function FormFoldersPage() {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await admitWorkspacePage(requireHubAccess());

  const api = new EndatixApi(session?.accessToken);
  const foldersApiResult = await api.folders.list();

  const error = toApiPageError(foldersApiResult);
  if (error && error.kind !== "api") return resolvePageError(error);

  const foldersResult = toResult(foldersApiResult, {
    fallbackMessage: "Failed to load form folders.",
    logMessage: "Failed to load form folders list.",
    loggerName: "forms.folders",
  });

  if (Result.isError(foldersResult)) {
    return <HubPageLoadError result={foldersResult} />;
  }

  const canManage = (await checkPermission(Permissions.Folders.Manage)).success;
  const folders = foldersResult.value;

  return withWorkspaceSetupEntry(
    <>
      <div className="mt-2 mb-4 flex flex-col gap-4 sm:mt-2 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Form folders" />
      </div>
      {folders.length === 0 ? (
        <NoFormFoldersEmptyState canManage={canManage} />
      ) : (
        <FolderNavigationCards
          folders={folders}
          targetBasePath="/forms/folders"
          canManage={canManage}
        />
      )}
    </>
  );
}

function NoFormFoldersEmptyState({ canManage }: { canManage: boolean }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>No form folders yet</EmptyTitle>
        <EmptyDescription>
          {canManage
            ? "Create folders to keep forms organized by team, workflow, or domain."
            : "No folders are available yet. Ask an administrator to create one."}
        </EmptyDescription>
      </EmptyHeader>
      {canManage ? (
        <EmptyContent className="flex-row justify-center gap-2">
          <CreateFolderDialog triggerLabel="Create Folder" showFolderPlusIcon />
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
