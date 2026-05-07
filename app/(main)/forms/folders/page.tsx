import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/auth";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { FolderCreateButton } from "@/features/folders/create-folder";
import { FolderEditButton } from "@/features/folders/update-folder";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import Link from "next/link";
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((f) => (
            <Card
              key={f.id}
              className="h-full transition-colors hover:bg-muted/50"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/forms/folders/${encodeURIComponent(f.slug)}`}
                    className="min-w-0 flex-1"
                  >
                    <CardTitle className="text-lg">{f.name}</CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">
                      {f.slug}
                    </CardDescription>
                  </Link>
                  {canManage ? <FolderEditButton folder={f} /> : null}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
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
          <FolderCreateButton triggerLabel="Create Folder" showFolderPlusIcon />
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
