"use client";

import { use } from "react";
import { TableSearchInput } from "@/components/table";
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
  tenantsPromise: Promise<ResultType<PlatformTenantsPage>>;
  currentTenantId?: string;
}

export function PlatformAdminsListToolbar({
  search,
  setSearch,
  updateUrl,
  searchParams,
  tenantsPromise,
  currentTenantId,
}: Readonly<PlatformAdminsListToolbarProps>) {
  // The tenant filter is secondary chrome: a failed tenant load leaves the list
  // usable rather than replacing the page with an error.
  const tenantsResult = use(tenantsPromise);
  const tenants = Result.isSuccess(tenantsResult)
    ? tenantsResult.value.items
    : [];
  const urlScope = searchParams.get("scope");
  const scopeFilter =
    urlScope === "approved" || urlScope === "candidates"
      ? urlScope
      : allScopesValue;
  const tenantFilter = searchParams.get("tenantId") ?? allTenantsValue;
  const onScopeFilterChange = createUrlFilterUpdater(
    updateUrl,
    "scope",
    allScopesValue,
  );
  const onTenantFilterChange = createUrlFilterUpdater(
    updateUrl,
    "tenantId",
    allTenantsValue,
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email"
        ariaLabel="Search platform administrators by name or email"
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select value={scopeFilter} onValueChange={onScopeFilterChange}>
          <SelectTrigger
            className="w-full lg:w-[180px]"
            aria-label="Filter platform administrators by approval status"
          >
            <SelectValue placeholder="Approval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allScopesValue}>All users</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="candidates">Candidates</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tenantFilter} onValueChange={onTenantFilterChange}>
          <SelectTrigger
            className="w-full lg:w-[200px]"
            aria-label="Filter platform administrators by tenant"
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
      </div>
    </div>
  );
}
