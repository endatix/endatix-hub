import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getFormsListPromise } from "@/features/forms/list-forms/list-forms.server";
import { FormsListSection } from "@/features/forms/list-forms/ui/forms-list-section";
import { getFormWorkspaceFlags } from "@/features/forms/form-workspace/form-workspace-flags.server";
import { FormsListSkeleton } from "@/features/forms/list-forms/ui/forms-list-skeleton";
import { FormsListToolbar } from "@/features/forms/list-forms/ui/forms-list-toolbar";
import { parseFormsListParams } from "@/features/forms/list-forms/utils";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { PagedListFrame, PagedListUrlProvider } from "@/components/table";
import { OpenCreateFormButton } from "@/features/forms/use-cases/create-form/ui/open-create-form-button";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { toDetailPageError } from "@/lib/errors/page-error";
import { resolvePageError } from "@/lib/errors/resolve-page-error";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FolderOpen, SearchX } from "lucide-react";

type PageProps = {
  params: Promise<{ folderSlug: string }>;
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    visibility?: string;
    browse?: string;
  }>;
};

export default async function FolderSlugFormsPage({
  params,
  searchParams,
}: Readonly<PageProps>) {
  const { folderSlug } = await params;
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await admitWorkspacePage(requireHubAccess());

  const api = new EndatixApi(session?.accessToken);
  const folderResult = await api.folders.getBySlug(folderSlug);

  if (ApiResult.isError(folderResult)) {
    return resolvePageError(toDetailPageError(folderResult));
  }

  const folder = folderResult.data;
  const resolvedSearchParams = await searchParams;
  const listRequest = parseFormsListParams(resolvedSearchParams, {
    kind: "folder",
    folderId: folder.id,
  });
  const formsPromise = getFormsListPromise(listRequest, session);

  return (
    <AssetStorageProvider>
      {folder.description ? (
        <p className="mb-3 text-sm text-muted-foreground">
          {folder.description}
        </p>
      ) : null}
      <PagedListUrlProvider>
        <FormsListToolbar variant="folder" />
        <PagedListFrame
          listKey={listQueryKey(listRequest)}
          fallback={<FormsListSkeleton pageSize={listRequest.pageSize} />}
        >
          <FolderFormsListSection formsPromise={formsPromise} />
        </PagedListFrame>
      </PagedListUrlProvider>
    </AssetStorageProvider>
  );
}

/** Reads the workspace flags inside the Suspense boundary, so the shell streams first. */
async function FolderFormsListSection({
  formsPromise,
}: Readonly<{ formsPromise: ReturnType<typeof getFormsListPromise> }>) {
  const workspaceFlags = await getFormWorkspaceFlags();
  return (
    <FormsListSection
      formsPromise={formsPromise}
      scope="folder"
      workspaceFlags={workspaceFlags}
      emptyState={<NoFolderFormsEmptyState />}
      filteredEmptyState={<NoMatchingFormsEmptyState />}
    />
  );
}

function NoFolderFormsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>No forms in this folder</EmptyTitle>
        <EmptyDescription>
          This folder does not contain any forms yet. Create a form and assign
          it here to get started.
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
