import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { SIGNIN_PATH } from "@/features/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { CreateFolderDialog } from "@/features/folders/create-folder";
import { FolderManagementListCard } from "@/features/folders/list-folders";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { hasValue, SearchParam } from "@/lib/utils/next-utils";
import { FolderCog, FolderOpen } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";

interface FoldersManagementPageProps {
  searchParams: Promise<{ action: SearchParam }>;
}

export default async function FoldersManagementPage({
  searchParams,
}: Readonly<FoldersManagementPageProps>) {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canManageFolders = (await checkPermission(Permissions.Folders.Manage))
    .success;
  if (!canManageFolders) {
    return <UnauthorizedComponent />;
  }

  const api = new EndatixApi(session?.accessToken);
  const foldersResult = await api.folders.list({ includeInactive: true });

  if (ApiResult.isError(foldersResult)) {
    if (foldersResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    return (
      <div className="text-sm text-destructive">
        {foldersResult.error.message}
      </div>
    );
  }

  const folders = foldersResult.data;
  const folderSummaries = await Promise.all(
    folders.map(async (folder) => {
      const [formsResult, templatesResult] = await Promise.all([
        api.forms.list({ folderId: folder.id }),
        api.formTemplates.list({ folderId: folder.id }),
      ]);

      return {
        folder,
        formCount: formsResult.success ? formsResult.data.totalRecords : 0,
        templateCount: templatesResult.success
          ? templatesResult.data.length
          : 0,
      };
    }),
  );
  const { action } = await searchParams;
  const openCreateOnLoad = hasValue(action, "create");

  return (
    <div className="flex flex-col gap-6">
      <CreateFolderDialog
        showTrigger={false}
        openOnLoad={openCreateOnLoad}
        replacePathOnClose="/folders"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <FolderCog className="mt-1 size-6 shrink-0 text-muted-foreground" />
          <div>
            <PageTitle title="Folders" className="text-2xl" />
            <p className="mt-2 text-sm text-muted-foreground">
              Manage folders and open a folder to view all forms and templates
              assigned to it.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {folderSummaries.map(({ folder, formCount, templateCount }) => (
          <FolderManagementListCard
            key={folder.id}
            folder={folder}
            formCount={formCount}
            templateCount={templateCount}
            canManage={canManageFolders}
          />
        ))}
      </div>

      {folderSummaries.length === 0 ? <NoFoldersEmptyState /> : null}
    </div>
  );
}

function NoFoldersEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>No folders yet</EmptyTitle>
        <EmptyDescription>
          Create your first folder to organize forms and templates by team,
          product area, or workflow.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <CreateFolderDialog triggerLabel="Create Folder" showFolderPlusIcon />
      </EmptyContent>
    </Empty>
  );
}
