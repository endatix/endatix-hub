import { auth } from "@/auth";
import MainHeader from "@/components/layout-ui/header/main-header";
import { Button } from "@/components/ui/button";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { getFolderManagementDetailCached } from "@/features/form-folders/application/get-folder-management-detail";
import { FolderDetailHeaderActions } from "@/features/form-folders/ui/folder-detail-header-actions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ folderId: string }>;
};

export default async function FolderDetailsHeaderSlot({
  params,
}: Readonly<PageProps>) {
  const { folderId } = await params;
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canManageFolders = await checkPermission(Permissions.Folders.Manage);
  if (!canManageFolders.success) {
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
      <MainHeader
        breadcrumb={
          <span className="text-sm text-destructive">
            {detail.error.message}
          </span>
        }
      />
    );
  }

  const { folder } = detail.data;

  return (
    <MainHeader
      sticky
      breadcrumb={
        <Button
          variant="ghost"
          asChild
          className="-ml-1 max-w-full justify-start pl-1 text-muted-foreground"
        >
          <Link href="/folders">
            <ChevronLeft className="size-4 shrink-0" />
            <span className="truncate">Back to folders</span>
          </Link>
        </Button>
      }
      actions={<FolderDetailHeaderActions folder={folder} />}
    />
  );
}
