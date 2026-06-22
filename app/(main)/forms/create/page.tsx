import PageTitle from "@/components/headings/page-title";
import { CreateFormWizard } from "@/features/forms/use-cases/create-form";
import { resolveEffectiveCreateFolderId } from "@/features/forms/use-cases/create-form/resolve-default-create-folder";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { EndatixApi } from "@/lib/endatix-api";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CreateFormPageProps {
  searchParams?: Promise<{ folderId?: string; folderSlug?: string }>;
}

export default async function CreateFormPage({
  searchParams,
}: Readonly<CreateFormPageProps>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const resolvedSearchParams = await searchParams;
  const requestedFolderId = resolvedSearchParams?.folderId?.trim();
  const requestedFolderSlug = resolvedSearchParams?.folderSlug?.trim();

  const api = new EndatixApi(session?.accessToken);
  const [settingsResult, foldersResult] = await Promise.all([
    api.tenant.getSettings(),
    api.folders.list(),
  ]);

  const requireFolderAssignment =
    settingsResult.success &&
    (settingsResult.data.requireFolderAssignment ?? false);
  const folders: Folder[] = foldersResult.success ? foldersResult.data : [];
  const defaultFolderId = resolveEffectiveCreateFolderId(folders, {
    folderId: requestedFolderId,
    folderSlug: requestedFolderSlug,
  });
  const defaultFolder = defaultFolderId
    ? folders.find((folder) => String(folder.id) === String(defaultFolderId))
    : undefined;

  if ((requestedFolderId || requestedFolderSlug) && !defaultFolderId) {
    notFound();
  }

  const backHref = defaultFolder?.slug
    ? `/forms/folders/${encodeURIComponent(defaultFolder.slug)}`
    : "/forms";

  return (
    <>
      <PageTitle title="Create Form" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          <Link
            href={{ pathname: backHref }}
            className="text-primary hover:underline"
          >
            ← Back to forms
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-semibold">Create a new form</h2>
          <p className="mb-6 text-muted-foreground">
            Design your form with a simple drag and drop interface.
          </p>

          <CreateFormWizard
            key={defaultFolderId ?? "create-form"}
            requireFolderAssignment={requireFolderAssignment}
            folders={folders}
            defaultFolderId={defaultFolderId}
            defaultFolderName={defaultFolder?.name}
            cancelHref={backHref}
          />
        </div>
      </div>
    </>
  );
}
