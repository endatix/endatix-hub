"use client";

import { Suspense } from "react";
import type { PlatformTenantListItem } from "@/lib/endatix-api";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import type { ResultType } from "@/lib/result";
import { listUrlStateFromSearchParams } from "../utils";
import { TenantsListToolbar } from "./tenants-list-toolbar";
import { TenantsTableFromPromise } from "./tenants-table";
import { TenantsTableSkeleton } from "./tenants-table-skeleton";

interface TenantsListProps {
  tenantsPromise: Promise<
    ResultType<NormalizedPagedResponse<PlatformTenantListItem>>
  >;
  /** Paired with `tenantsPromise` from the RSC so Suspense remounts with the matching payload. */
  listKey: string;
  canManage?: boolean;
}

export function TenantsList({
  tenantsPromise,
  listKey,
  canManage = false,
}: Readonly<TenantsListProps>) {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();
  const urlState = listUrlStateFromSearchParams(searchParams);

  return (
    <>
      <TenantsListToolbar
        search={search}
        setSearch={setSearch}
        updateUrl={updateUrl}
        urlState={urlState}
        isPending={isPending}
      />
      <Suspense key={listKey} fallback={<TenantsTableSkeleton />}>
        <TenantsTableFromPromise
          tenantsPromise={tenantsPromise}
          canManage={canManage}
          updateUrl={updateUrl}
          urlState={urlState}
          isPending={isPending}
        />
      </Suspense>
    </>
  );
}
