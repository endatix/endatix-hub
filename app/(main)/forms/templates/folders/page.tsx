import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { toDetailPageError } from "@/lib/errors/page-error";
import { resolvePageError } from "@/lib/errors/resolve-page-error";
import { FolderNavigationCards } from "@/features/folders/list-folders";

export default async function TemplateFoldersPage() {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const foldersResult = await new EndatixApi(session?.accessToken).folders.list();
  if (ApiResult.isError(foldersResult))
    return resolvePageError(toDetailPageError(foldersResult));
  const canManage = (await checkPermission(Permissions.Folders.Manage)).success;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Template folders" className="mt-2" />
      <FolderNavigationCards
        folders={foldersResult.data}
        targetBasePath="/forms/templates/folders"
        canManage={canManage}
      />
    </div>
  );
}
