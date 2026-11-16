"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  DataTableFilter,
  DataTableToolbar,
  PagedCardList,
  TableSearchInput,
  useListUrlState,
} from "@/components/table";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { DisabledButton } from "@/components/ui/disabled-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  PagedResponse,
  PermissionListItem,
  RoleListItem,
} from "@/lib/endatix-api";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createUrlFilterUpdater } from "@/lib/utils/list-table-url-utils";
import { RolesTable } from "./roles-table";

const allRoleTypesValue = "__all_role_types__";

interface RolesListProps {
  rolesPromise: Promise<PagedResponse<RoleListItem>>;
  permissionsPromise: Promise<PermissionListItem[]>;
  listKey: string;
  canManageRoles: boolean;
}

/** List shell: owns the URL state once for the toolbar and the grid. */
export function RolesList({
  rolesPromise,
  permissionsPromise,
  listKey,
  canManageRoles,
}: Readonly<RolesListProps>) {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PagedCardList
      listKey={listKey}
      isPending={isPending}
      className=""
      headerClassName=""
      toolbar={
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <CardTitle className="shrink-0 text-lg">All Roles</CardTitle>
          <RolesToolbar
            search={search}
            setSearch={setSearch}
            updateUrl={updateUrl}
            searchParams={searchParams}
            createAction={
              <CreateRoleAction
                canManageRoles={canManageRoles}
                onCreate={() => setCreateOpen(true)}
              />
            }
          />
        </div>
      }
    >
      <RolesTable
        rolesPromise={rolesPromise}
        permissionsPromise={permissionsPromise}
        canManageRoles={canManageRoles}
        updateUrl={updateUrl}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    </PagedCardList>
  );
}

type RolesToolbarProps = {
  search: string;
  setSearch: (value: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  searchParams: URLSearchParams;
  createAction: ReactNode;
};

/** Search and Role type; Reset clears both. */
function RolesToolbar({
  search,
  setSearch,
  updateUrl,
  searchParams,
  createAction,
}: Readonly<RolesToolbarProps>) {
  const urlRoleType = searchParams.get("roleType");
  const roleType =
    urlRoleType === "system" || urlRoleType === "custom"
      ? urlRoleType
      : allRoleTypesValue;
  const isTypeFiltered = roleType !== allRoleTypesValue;
  return (
    <DataTableToolbar
      className="md:flex-1"
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search roles"
          ariaLabel="Search organization roles by name"
          className="md:max-w-xs"
        />
      }
      filters={
        <RoleTypeFilter
          value={roleType}
          onChange={createUrlFilterUpdater(
            updateUrl,
            "roleType",
            allRoleTypesValue,
          )}
        />
      }
      activeFilterCount={isTypeFiltered ? 1 : 0}
      reset={{
        onClick: () => {
          setSearch("");
          updateUrl({ search: null, roleType: null, page: "1" });
        },
        hasFilters: Boolean(search.trim()) || isTypeFiltered,
      }}
      actions={createAction}
    />
  );
}

function RoleTypeFilter({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <DataTableFilter label="Role type">
      {({ id }) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            id={id}
            className="w-full md:w-[160px]"
            aria-label={id ? undefined : "Filter roles by type"}
          >
            <SelectValue placeholder="Role type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allRoleTypesValue}>All types</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      )}
    </DataTableFilter>
  );
}

function CreateRoleAction({
  canManageRoles,
  onCreate,
}: Readonly<{ canManageRoles: boolean; onCreate: () => void }>) {
  if (canManageRoles) {
    return (
      <Button onClick={onCreate}>
        <Plus data-icon="inline-start" />
        Create Role
      </Button>
    );
  }
  return (
    <TooltipProvider>
      <DisabledButton tooltip="You don't have permission to manage roles">
        <Plus data-icon="inline-start" />
        Create Role
      </DisabledButton>
    </TooltipProvider>
  );
}
