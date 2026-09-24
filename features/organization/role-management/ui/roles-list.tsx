"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
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
  const urlRoleType = searchParams.get("roleType");
  const roleTypeFilter =
    urlRoleType === "system" || urlRoleType === "custom"
      ? urlRoleType
      : allRoleTypesValue;
  const onRoleTypeFilterChange = createUrlFilterUpdater(
    updateUrl,
    "roleType",
    allRoleTypesValue,
  );

  return (
    <PagedCardList
      listKey={listKey}
      isPending={isPending}
      className=""
      headerClassName=""
      toolbar={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">All Roles</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search roles"
              ariaLabel="Search organization roles by name"
              className="sm:max-w-xs"
            />
            <Select
              value={roleTypeFilter}
              onValueChange={onRoleTypeFilterChange}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Role type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allRoleTypesValue}>All types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {canManageRoles ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                Create Role
              </Button>
            ) : (
              <TooltipProvider>
                <DisabledButton tooltip="You don't have permission to manage roles">
                  <Plus data-icon="inline-start" />
                  Create Role
                </DisabledButton>
              </TooltipProvider>
            )}
          </div>
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
