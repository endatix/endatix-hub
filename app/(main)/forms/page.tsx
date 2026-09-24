import { Suspense } from "react";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { FolderNavigationCards } from "@/features/folders/list-folders";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { getFormsListPromise } from "@/features/forms/list-forms/list-forms.server";
import { FormsListSection } from "@/features/forms/list-forms/ui/forms-list-section";
import { FormsListSkeleton } from "@/features/forms/list-forms/ui/forms-list-skeleton";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { PagedListFrame, PagedListUrlProvider } from "@/components/table";
import { FormsListToolbar } from "@/features/forms/list-forms/ui/forms-list-toolbar";
import {
  buildFolderContextById,
  parseFormsListParams,
  resolveRootFormsViewMode,
  shouldHideFolderShortcuts,
  type FormFolderContext,
} from "@/features/forms/list-forms/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FileText, SearchX } from "lucide-react";
import { OpenCreateFormButton } from "@/features/forms/use-cases/create-form/ui/open-create-form-button";
import { Skeleton } from "@/components/ui/skeleton";

interface FormsPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    visibility?: string;
    browse?: string;
  }>;
}

export default async function FormsPage({
  searchParams,
}: Readonly<FormsPageProps>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const resolvedSearchParams = await searchParams;
  const listRequest = parseFormsListParams(resolvedSearchParams, {
    kind: "root",
  });
  const viewMode = resolveRootFormsViewMode(resolvedSearchParams);
  const hideFolders = shouldHideFolderShortcuts(resolvedSearchParams);
  const formsPromise = getFormsListPromise(listRequest, session);
  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);
  const folderContextByIdPromise = headerDataPromise.then((headerData) =>
    buildFolderContextById(headerData.folders ?? []),
  );

  return (
    <PagedListUrlProvider>
      <FormsListToolbar variant="root" />
      {!hideFolders && (
        <Suspense fallback={<FolderCardsSkeleton />}>
          <FormsFoldersSection headerDataPromise={headerDataPromise} />
        </Suspense>
      )}
      <AssetStorageProvider>
        <PagedListFrame
          listKey={listQueryKey(listRequest)}
          fallback={<FormsListSkeleton pageSize={listRequest.pageSize} />}
        >
          <FormsListSectionWithFolders
            formsPromise={formsPromise}
            folderContextByIdPromise={folderContextByIdPromise}
            viewMode={viewMode}
          />
        </PagedListFrame>
      </AssetStorageProvider>
    </PagedListUrlProvider>
  );
}

async function FormsListSectionWithFolders({
  formsPromise,
  folderContextByIdPromise,
  viewMode,
}: Readonly<{
  formsPromise: ReturnType<typeof getFormsListPromise>;
  folderContextByIdPromise: Promise<ReadonlyMap<string, FormFolderContext>>;
  viewMode: ReturnType<typeof resolveRootFormsViewMode>;
}>) {
  const folderContextById = await folderContextByIdPromise;

  return (
    <FormsListSection
      formsPromise={formsPromise}
      scope="root"
      folderContextById={folderContextById}
      emptyState={
        viewMode === "all" ? (
          <NoAllFormsEmptyState />
        ) : (
          <NoUnassignedFormsEmptyState />
        )
      }
      filteredEmptyState={<NoMatchingFormsEmptyState />}
    />
  );
}

async function FormsFoldersSection({
  headerDataPromise,
}: Readonly<{
  headerDataPromise: ReturnType<typeof getFormsHeaderDataCached>;
}>) {
  const headerData = await headerDataPromise;
  if (headerData.folders === undefined || headerData.folders.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="forms-folders-heading" className="mb-6">
      <h2
        id="forms-folders-heading"
        className="mb-3 text-sm font-medium tracking-wide text-foreground"
      >
        Folders
      </h2>
      <FolderNavigationCards
        folders={headerData.folders}
        targetBasePath="/forms/folders"
      />
    </section>
  );
}

function NoUnassignedFormsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>No unassigned forms yet</EmptyTitle>
        <EmptyDescription>
          Forms without a folder appear here. Create a new form or move an
          existing form out of its folder.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <OpenCreateFormButton />
      </EmptyContent>
    </Empty>
  );
}

function NoAllFormsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>No forms yet</EmptyTitle>
        <EmptyDescription>
          Create your first form to start collecting responses.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <OpenCreateFormButton />
      </EmptyContent>
    </Empty>
  );
}

function NoMatchingFormsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>No forms match your filters</EmptyTitle>
        <EmptyDescription>
          Try a different search term or adjust the status and visibility
          filters.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function FolderCardsSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="mb-3 h-4 w-20" />
      <div className="grid-card-list">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
