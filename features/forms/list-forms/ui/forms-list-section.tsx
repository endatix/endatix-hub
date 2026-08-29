"use client";

import type { ReactNode } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ResultLoadErrorView } from "@/components/error-handling/error-page";
import { PagedListFooter } from "@/components/ui/paged-list-footer";
import FormsList from "@/features/forms/ui/forms-list";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { Result } from "@/lib/result";
import type { FormsListResult } from "../list-forms.server";
import {
  hasActiveFormsListFilters,
  isTenantWideFormsList,
  type FormFolderContext,
} from "../utils";

interface FormsListSectionProps {
  formsPromise: Promise<FormsListResult>;
  emptyState: ReactNode;
  filteredEmptyState: ReactNode;
  scope: "root" | "folder";
  folderContextById?: ReadonlyMap<string, FormFolderContext>;
}

export function FormsListSection({
  formsPromise,
  emptyState,
  filteredEmptyState,
  scope,
  folderContextById,
}: Readonly<FormsListSectionProps>) {
  const listResult = use(formsPromise);
  const router = useRouter();
  const { updateUrl, searchParams } = useListUrlState();

  if (Result.isError(listResult)) {
    return (
      <ResultLoadErrorView
        result={listResult}
        onRetry={() => router.refresh()}
      />
    );
  }

  const pagedForms = normalizePagedResponse(listResult.value);
  const filtersActive = hasActiveFormsListFilters(searchParams);
  const showFolderContext =
    scope === "root" &&
    isTenantWideFormsList(
      {
        search: searchParams.get("search") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        visibility: searchParams.get("visibility") ?? undefined,
        browse: searchParams.get("browse") ?? undefined,
      },
      { kind: "root" },
    );

  const emptyListState = filtersActive ? filteredEmptyState : emptyState;

  return (
    <div className="flex flex-col gap-6">
      {pagedForms.items.length === 0 ? (
        emptyListState
      ) : (
        <FormsList
          forms={[...pagedForms.items]}
          showFolderContext={showFolderContext}
          folderContextById={folderContextById}
        />
      )}
      {pagedForms.totalRecords > 0 ? (
        <div className="rounded-xl border bg-card">
          <PagedListFooter
            entityLabel="forms"
            page={pagedForms.page}
            pageSize={pagedForms.pageSize}
            totalPages={pagedForms.totalPages}
            totalRecords={pagedForms.totalRecords}
            hasNextPage={pagedForms.hasNextPage}
            pageSizeOptions={[25, 50, 100]}
            onPageChange={(page) => updateUrl({ page: String(page) })}
            onPageSizeChange={(pageSize) =>
              updateUrl({
                pageSize: String(pageSize),
                page: "1",
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
