import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { CreateFolderDialog } from "@/features/folders/create-folder";
import { FolderNavigationCards } from "@/features/folders/list-folders";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { redirect } from "next/navigation";
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
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const foldersResult = await api.folders.list();

  if (ApiResult.isError(foldersResult)) {
    if (foldersResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    if (foldersResult.error.type === ApiErrorType.ForbiddenError) {
      redirect(UNAUTHORIZED_PATH);
    }
    return (
      <div className="mt-4 p-6 text-destructive">
        {foldersResult.error.message}
      </div>
    );
  }

  const canManage = (await checkPermission(Permissions.Folders.Manage)).success;
  const folders = foldersResult.data;

  return (
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
