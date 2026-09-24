import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getFormsListPromise } from "@/features/forms/list-forms/list-forms.server";
import { FormsListSection } from "@/features/forms/list-forms/ui/forms-list-section";
import { FormsListSkeleton } from "@/features/forms/list-forms/ui/forms-list-skeleton";
import { FormsListToolbar } from "@/features/forms/list-forms/ui/forms-list-toolbar";
import { parseFormsListParams } from "@/features/forms/list-forms/utils";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { PagedListFrame, PagedListUrlProvider } from "@/components/table";
import { OpenCreateFormButton } from "@/features/forms/use-cases/create-form/ui/open-create-form-button";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { notFound, redirect } from "next/navigation";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
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
          <FormsListSection
            formsPromise={formsPromise}
            scope="folder"
            emptyState={<NoFolderFormsEmptyState />}
            filteredEmptyState={<NoMatchingFormsEmptyState />}
          />
        </PagedListFrame>
      </PagedListUrlProvider>
    </AssetStorageProvider>
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
