"use client";

import { use } from "react";
import { Plus } from "lucide-react";
import { TableSearchInput } from "@/components/table";
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
  const assignableRoles = availableRoles.filter(
    (role) => !isPlatformScopedRole(role.name),
  );
  const roleFilter = searchParams.get("role") ?? allRolesValue;
  const urlStatus = searchParams.get("status");
  const statusFilter =
    urlStatus === "active" || urlStatus === "pending" || urlStatus === "locked"
      ? urlStatus
      : allStatusesValue;
  const onRoleFilterChange = createUrlFilterUpdater(
    updateUrl,
    "role",
    allRolesValue,
  );
  const onStatusFilterChange = createUrlFilterUpdater(
    updateUrl,
    "status",
    allStatusesValue,
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email"
        ariaLabel="Search organization users by name or email"
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allRolesValue}>All roles</SelectItem>
            {availableRoles.map((role) => (
              <SelectItem key={role.id} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full lg:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allStatusesValue}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending invite</SelectItem>
            <SelectItem value="locked">Locked out</SelectItem>
          </SelectContent>
        </Select>
        {canInviteUsers ? (
          <CreateTenantUserDialog roles={assignableRoles} />
        ) : (
          <TooltipProvider>
            <DisabledButton tooltip="You don't have permission to invite users">
              <Plus data-icon="inline-start" />
              Invite User
            </DisabledButton>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
