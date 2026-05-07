import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import FormTemplatesList from "@/features/form-templates/ui/form-templates-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ folderSlug: string }>;
};

export default async function TemplateFolderSlugPage({ params }: PageProps) {
  const { folderSlug } = await params;
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const folderResult = await api.folders.getBySlug(folderSlug);

  if (ApiResult.isError(folderResult)) {
    if (folderResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    if (folderResult.error.type === ApiErrorType.ForbiddenError) {
      redirect(UNAUTHORIZED_PATH);
    }
    notFound();
  }

  const folder = folderResult.data;
  const [templatesResult, settingsResult] = await Promise.all([
    api.formTemplates.list({ folderId: folder.id }),
    api.tenant.getSettings(),
  ]);
  const requireFolderAssignment =
    settingsResult.success &&
    settingsResult.data.requireFolderAssignment === true;

  return (
    <AssetStorageProvider>
      <div className="mt-2 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title={folder.name} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/forms/templates/folders">Folders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/forms/templates">All templates</Link>
          </Button>
        </div>
      </div>
      {folder.description ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {folder.description}
        </p>
      ) : null}
      <FormTemplatesList
        templatesPromise={Promise.resolve(templatesResult)}
        requireFolderAssignment={requireFolderAssignment}
      />
    </AssetStorageProvider>
  );
}
