import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { FolderNavigationCards } from "@/features/folders/list-folders";

export default async function TemplateFoldersPage() {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const foldersResult = await api.folders.list();
  const folders = ApiResult.isError(foldersResult) ? [] : foldersResult.data;
  const canManage = (await checkPermission(Permissions.Folders.Manage)).success;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Template folders" className="mt-2" />
      <FolderNavigationCards
        folders={folders}
        targetBasePath="/forms/templates/folders"
        canManage={canManage}
      />
    </div>
  );
}
