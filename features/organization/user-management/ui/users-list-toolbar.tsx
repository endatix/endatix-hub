"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import {
  DataTableFilter,
  DataTableToolbar,
  TableSearchInput,
} from "@/components/table";
import { DisabledButton } from "@/components/ui/disabled-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { RoleListItem } from "@/lib/endatix-api";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createUrlFilterUpdater } from "@/lib/utils/list-table-url-utils";
import { CreateTenantUserDialog } from "../use-cases/create-tenant-user/ui/create-tenant-user-dialog";
import { isPlatformScopedRole } from "./platform-scoped-role";

const allRolesValue = "__all_roles__";
const allStatusesValue = "__all_statuses__";

interface UsersListToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  searchParams: URLSearchParams;
  availableRolesPromise: Promise<RoleListItem[]>;
  canInviteUsers: boolean;
}

export function UsersListToolbar({
  search,
  setSearch,
  updateUrl,
  searchParams,
  availableRolesPromise,
  canInviteUsers,
}: Readonly<UsersListToolbarProps>) {
  const availableRoles = use(availableRolesPromise);
  const filters = usersFilterState(searchParams);
  return (
    <DataTableToolbar
      search={
        <TableSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          ariaLabel="Search organization users by name or email"
        />
      }
      filters={
        <>
          <RoleFilter
            value={filters.role}
            roles={availableRoles}
            onChange={createUrlFilterUpdater(updateUrl, "role", allRolesValue)}
          />
          <StatusFilter
            value={filters.status}
            onChange={createUrlFilterUpdater(
              updateUrl,
              "status",
              allStatusesValue,
            )}
          />
        </>
      }
      activeFilterCount={filters.activeCount}
      reset={{
        onClick: () => {
          setSearch("");
          updateUrl({ search: null, role: null, status: null, page: "1" });
        },
        hasFilters: Boolean(search.trim()) || filters.activeCount > 0,
      }}
      actions={
        <InviteUserAction
          canInviteUsers={canInviteUsers}
          roles={availableRoles}
        />
      }
    />
  );
}

/** The Role and Status filters as the URL holds them, and how many differ from "all". */
function usersFilterState(searchParams: URLSearchParams) {
  const role = searchParams.get("role") ?? allRolesValue;
  const urlStatus = searchParams.get("status");
  const status =
    urlStatus === "active" || urlStatus === "pending" || urlStatus === "locked"
      ? urlStatus
      : allStatusesValue;
  const activeCount =
    Number(role !== allRolesValue) + Number(status !== allStatusesValue);
  return { role, status, activeCount };
}

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

function RoleFilter({
  value,
  roles,
  onChange,
}: Readonly<FilterSelectProps & { roles: RoleListItem[] }>) {
  return (
    <DataTableFilter label="Role">
      {({ id }) => (
        <Select value={value} onValueChange={onChange}>
          <FilterTrigger
            id={id}
            label="Filter users by role"
            placeholder="Role"
          />
          <SelectContent>
            <SelectItem value={allRolesValue}>All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </DataTableFilter>
  );
}

function StatusFilter({ value, onChange }: Readonly<FilterSelectProps>) {
  return (
    <DataTableFilter label="Status">
      {({ id }) => (
        <Select value={value} onValueChange={onChange}>
          <FilterTrigger
            id={id}
            label="Filter users by status"
            placeholder="Status"
          />
          <SelectContent>
            <SelectItem value={allStatusesValue}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending invite</SelectItem>
            <SelectItem value="locked">Locked out</SelectItem>
          </SelectContent>
        </Select>
      )}
    </DataTableFilter>
  );
}

/** In the Filters drawer the label names the trigger (`id`); in the row, `aria-label` does. */
function FilterTrigger({
  id,
  label,
  placeholder,
}: Readonly<{ id?: string; label: string; placeholder: string }>) {
  return (
    <SelectTrigger
      id={id}
      className="w-full md:w-[180px]"
      aria-label={id ? undefined : label}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
  );
}

function InviteUserAction({
  canInviteUsers,
  roles,
}: Readonly<{ canInviteUsers: boolean; roles: RoleListItem[] }>) {
  if (canInviteUsers) {
    const assignable = roles.filter((role) => !isPlatformScopedRole(role.name));
    return <CreateTenantUserDialog roles={assignable} />;
  }
  return (
    <TooltipProvider>
      <DisabledButton tooltip="You don't have permission to invite users">
        <Plus data-icon="inline-start" />
        Invite User
      </DisabledButton>
    </TooltipProvider>
  );
}
