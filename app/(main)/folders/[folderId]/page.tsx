import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import {
  FolderDetailsView,
  getFolderManagementPageDataCached,
} from "@/features/folders/view-folder-management";
import { resolvePageError } from "@/lib/errors/resolve-page-error";

type PageProps = {
  params: Promise<{ folderId: string }>;
};

export default async function FolderDetailsPage({
  params,
}: Readonly<PageProps>) {
  const { folderId } = await params;
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Folders.Manage);

  const pageData = await getFolderManagementPageDataCached(
    session?.accessToken,
    folderId,
  );

  if (!pageData.ok) {
    return resolvePageError(pageData.error);
  }

  const { folder, forms, templates, moveTargetFolders } = pageData.data;

  return (
    <FolderDetailsView
      folder={folder}
      forms={forms}
      templates={templates}
      moveTargetFolders={moveTargetFolders}
    />
  );
}
