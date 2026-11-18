"use client";

import { useBrand } from "@/lib/branding/client";
import { Info } from "lucide-react";
import {
  listFilterReset,
  PagedCardList,
  useListUrlState,
} from "@/components/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  PagedResponse,
  PlatformAdminUserListItem,
} from "@/lib/endatix-api";
import type { PlatformTenantsPage } from "@/lib/endatix-api/platform-tenants/platform-tenants";
import type { ResultType } from "@/lib/result";
import { PlatformAdminsListToolbar } from "./platform-admins-list-toolbar";
import { PlatformAdminsTable } from "./platform-admins-table";

interface PlatformAdminsListProps {
  usersPromise: Promise<PagedResponse<PlatformAdminUserListItem>>;
  tenantsPromise: Promise<ResultType<PlatformTenantsPage>>;
  approvedAdminTotalPromise: Promise<number>;
  listKey: string;
  currentUserId?: string;
  currentTenantId?: string;
}

/** The URL keys the toolbar's filters write, besides `search`. */
const ADMIN_FILTER_KEYS = ["scope", "tenantId"] as const;

/** List shell: owns the URL state once for the toolbar and the grid. */
export function PlatformAdminsList({
  usersPromise,
  tenantsPromise,
  approvedAdminTotalPromise,
  listKey,
  currentUserId,
  currentTenantId,
}: Readonly<PlatformAdminsListProps>) {
  const brand = useBrand();
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();
  const reset = listFilterReset(setSearch, updateUrl, ADMIN_FILTER_KEYS);
  const isFiltered = ["search", ...ADMIN_FILTER_KEYS].some((key) =>
    searchParams.get(key),
  );

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Local PlatformAdmin approval</AlertTitle>
        <AlertDescription>
          External identity provider roles nominate users for platform
          administration. Local approval in {brand.shortName} grants or revokes platform
          access.
        </AlertDescription>
      </Alert>

      <PagedCardList
        listKey={listKey}
        isPending={isPending}
        toolbar={
          <PlatformAdminsListToolbar
            search={search}
            setSearch={setSearch}
            updateUrl={updateUrl}
            searchParams={searchParams}
            reset={reset}
            tenantsPromise={tenantsPromise}
            currentTenantId={currentTenantId}
          />
        }
      >
        <PlatformAdminsTable
          usersPromise={usersPromise}
          approvedAdminTotalPromise={approvedAdminTotalPromise}
          updateUrl={updateUrl}
          currentUserId={currentUserId}
          onClearFilters={isFiltered ? reset.clearFilters : undefined}
        />
      </PagedCardList>
    </div>
  );
}
