"use client";

import { use } from "react";
import {
  DataTableFilter,
  DataTableToolbar,
  TableSearchInput,
  type ListFilterReset,
} from "@/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlatformTenantsPage } from "@/lib/endatix-api/platform-tenants/platform-tenants";
import { Result, type ResultType } from "@/lib/result";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createUrlFilterUpdater } from "@/lib/utils/list-table-url-utils";

const allScopesValue = "__all_scopes__";
const allTenantsValue = "__all_tenants__";

interface PlatformAdminsListToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  searchParams: URLSearchParams;
  /** Built once in the list shell and shared with the empty state's Clear filters. */
  reset: ListFilterReset;
  tenantsPromise: Promise<ResultType<PlatformTenantsPage>>;
  currentTenantId?: string;
}

export function PlatformAdminsListToolbar({
  search,
  setSearch,
  updateUrl,
  searchParams,
  reset,
  tenantsPromise,
  currentTenantId,
}: Readonly<PlatformAdminsListToolbarProps>) {
  // The tenant filter is secondary chrome: a failed tenant load leaves the list
  // usable rather than replacing the page with an error.
  const tenantsResult = use(tenantsPromise);
  const tenants = Result.isSuccess(tenantsResult)
    ? tenantsResult.value.items
    : [];
  const filters = adminsFilterState(searchParams);
  return (
    <DataTableToolbar
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          ariaLabel="Search platform administrators by name or email"
        />
      }
      filters={
        <>
          <ScopeFilter
            value={filters.scope}
            onChange={createUrlFilterUpdater(
              updateUrl,
              "scope",
              allScopesValue,
            )}
          />
          <TenantFilter
            value={filters.tenant}
            tenants={tenants}
            currentTenantId={currentTenantId}
            onChange={createUrlFilterUpdater(
              updateUrl,
              "tenantId",
              allTenantsValue,
            )}
          />
        </>
      }
      activeFilterCount={filters.activeCount}
      reset={{
        onClick: reset.clearFilters,
        hasFilters: Boolean(search.trim()) || filters.activeCount > 0,
      }}
    />
  );
}

function adminsFilterState(searchParams: URLSearchParams) {
  const urlScope = searchParams.get("scope");
  const scope =
    urlScope === "approved" || urlScope === "candidates"
      ? urlScope
      : allScopesValue;
  const tenant = searchParams.get("tenantId") ?? allTenantsValue;
  const activeCount =
    Number(scope !== allScopesValue) + Number(tenant !== allTenantsValue);
  return { scope, tenant, activeCount };
}

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

function ScopeFilter({ value, onChange }: Readonly<FilterSelectProps>) {
  return (
    <DataTableFilter label="Approval">
      {({ id }) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            id={id}
            className="w-full md:w-[180px]"
            aria-label={
              id
                ? undefined
                : "Filter platform administrators by approval status"
            }
          >
            <SelectValue placeholder="Approval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allScopesValue}>All users</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="candidates">Candidates</SelectItem>
          </SelectContent>
        </Select>
      )}
    </DataTableFilter>
  );
}

type TenantFilterProps = FilterSelectProps & {
  tenants: PlatformTenantsPage["items"];
  currentTenantId?: string;
};

function TenantFilter({
  value,
  tenants,
  currentTenantId,
  onChange,
}: Readonly<TenantFilterProps>) {
  return (
    <DataTableFilter label="Tenant">
      {({ id }) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            id={id}
            className="w-full md:w-[200px]"
            aria-label={
              id ? undefined : "Filter platform administrators by tenant"
            }
          >
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allTenantsValue}>All tenants</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
                {tenant.id === currentTenantId ? (
                  <span className="text-muted-foreground"> (current)</span>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </DataTableFilter>
  );
}
