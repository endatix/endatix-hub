import PageTitle from "@/components/headings/page-title";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import FormTemplatesList from "@/features/form-templates/ui/form-templates-list";
import { FolderNavigationCards } from "@/features/folders/list-folders";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { EndatixApi } from "@/lib/endatix-api";

export default async function FormTemplatesPage() {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);

  return (
    <>
      <PageTitle title="Form Templates" className="mt-2 mb-4" />
      <Suspense fallback={<FolderCardsSkeleton />}>
        <TemplatesFoldersSection headerDataPromise={headerDataPromise} />
      </Suspense>
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<FormTemplatesSkeleton />}>
          <FormTemplatesContent accessToken={session?.accessToken} />
        </Suspense>
      </div>
    </>
  );
}

async function TemplatesFoldersSection({
  headerDataPromise,
}: Readonly<{
  headerDataPromise: ReturnType<typeof getFormsHeaderDataCached>;
}>) {
  const headerData = await headerDataPromise;
  if (headerData.folders.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <FolderNavigationCards
        folders={headerData.folders}
        targetBasePath="/forms/templates/folders"
      />
    </div>
  );
}

async function FormTemplatesContent({
  accessToken,
}: Readonly<{ accessToken: string | undefined }>) {
  const api = new EndatixApi(accessToken);
  const [templatesResult, settingsResult] = await Promise.all([
    api.formTemplates.list({ filter: "folderId:null" }),
    api.tenant.getSettings(),
  ]);

  const requireFolderAssignment =
    settingsResult.success &&
    settingsResult.data.requireFolderAssignment === true;

  return (
    <AssetStorageProvider>
      <FormTemplatesList
        templatesPromise={Promise.resolve(templatesResult)}
        requireFolderAssignment={requireFolderAssignment}
      />
    </AssetStorageProvider>
  );
}

function FormTemplatesSkeleton() {
  const cards = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card} className="group flex flex-col justify-between gap-1">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderCardsSkeleton() {
  return (
    <div className="grid-card-list mb-6">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}
