import { auth } from "@/auth";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { getFolderManagementDetailCached } from "@/features/form-folders/application/get-folder-management-detail";
import { FolderDetailsView } from "@/features/form-folders/ui/folder-details-view";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ folderId: string }>;
};

export default async function FolderDetailsPage({
  params,
}: Readonly<PageProps>) {
  const { folderId } = await params;
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canManage = (await checkPermission(Permissions.Folders.Manage)).success;
  if (!canManage) {
    redirect(UNAUTHORIZED_PATH);
  }

  const detail = await getFolderManagementDetailCached(
    session?.accessToken,
    folderId,
  );
  if (!detail.ok) {
    if (detail.error.kind === "not_found") {
      notFound();
    }
    if (detail.error.kind === "auth") {
      redirect(SIGNIN_PATH);
    }
    return (
      <div className="text-sm text-destructive">{detail.error.message}</div>
    );
  }

  const { folder, allFolders } = detail.data;

  const api = new EndatixApi(session?.accessToken);

  const [formsResult, templatesResult] = await Promise.all([
    api.forms.list({ folderId: folder.id }),
    api.formTemplates.list({ folderId: folder.id }),
  ]);

  if (ApiResult.isError(formsResult)) {
    if (formsResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    if (formsResult.error.type === ApiErrorType.ForbiddenError) {
      redirect(UNAUTHORIZED_PATH);
    }
    return (
      <div className="text-sm text-destructive">
        {formsResult.error.message}
      </div>
    );
  }

  if (ApiResult.isError(templatesResult)) {
    if (templatesResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    if (templatesResult.error.type === ApiErrorType.ForbiddenError) {
      redirect(UNAUTHORIZED_PATH);
    }
    return (
      <div className="text-sm text-destructive">
        {templatesResult.error.message}
      </div>
    );
  }

  return (
    <FolderDetailsView
      folder={folder}
      forms={formsResult.data}
      templates={templatesResult.data}
      moveTargetFolders={allFolders}
    />
  );
}
