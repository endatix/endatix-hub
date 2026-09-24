"use client";

import {
  use,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { MoreHorizontal, Search, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DisabledMenuItem } from "@/components/ui/disabled-menu-item";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import {
  createPagedTableFooterProps,
  PagedTableFooter,
  TableEmptyRow,
} from "@/components/table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import type {
  PagedResponse,
  PermissionListItem,
  RoleListItem,
} from "@/lib/endatix-api";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
  type RoleActionState,
} from "../use-cases/role-management.actions";
import {
  getRolePermissionSummary,
  isAssignablePermissionName,
  type RolePermissionSummary,
} from "../role-permission-summary";
import Link from "next/link";

interface RolesTableProps {
  rolesPromise: Promise<PagedResponse<RoleListItem>>;
  permissionsPromise: Promise<PermissionListItem[]>;
  canManageRoles: boolean;
  /** From the list shell's `useListUrlState`. The table never owns a URL writer. */
  updateUrl: UrlSearchParamsUpdater;
  /** Create panel state lives in the shell; its button sits in the toolbar. */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

const initialState: RoleActionState = { isSuccess: undefined };
const NO_DESCRIPTION_LABEL = "No description provided.";
const EMPTY_ROLES_MESSAGE = "No roles match the current filters.";

type RoleTableRow = {
  permissionSummary: RolePermissionSummary;
  role: RoleListItem;
  userCount: number;
};

const permissionCategoryLabels: Record<string, string> = {
  access: "Access Controls",
  platform: "Platform Management",
  tenant: "Tenant Management",
  forms: "Forms Management",
  folders: "Folders",
  templates: "Templates",
  themes: "Themes",
  submissions: "Submissions",
  questions: "Questions",
  custom: "Custom",
};

export function RolesTable({
  rolesPromise,
  permissionsPromise,
  canManageRoles,
  updateUrl,
  createOpen,
  onCreateOpenChange: setCreateOpen,
}: Readonly<RolesTableProps>) {
  const pagedRoles = normalizePagedResponse(use(rolesPromise));
  const permissions = use(permissionsPromise);
  const roleRows: RoleTableRow[] = pagedRoles.items.map((role) => ({
    permissionSummary: getRolePermissionSummary(role),
    role,
    userCount: role.usersCount,
  }));
  const hasRoles = roleRows.length > 0;
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const handledCreateStateRef = useRef<RoleActionState | null>(null);
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(
    createRoleAction,
    initialState,
  );
  const [isPending, startTransition] = useTransition();
  const createSubmitLabel = pending ? "Creating..." : "Create Role";
  const saveSubmitLabel = isPending ? "Saving..." : "Save Changes";

  useEffect(() => {
    if (state.isSuccess && handledCreateStateRef.current !== state) {
      handledCreateStateRef.current = state;
      toast.success("Role created");
      trackEvent("organization_role_created", {
        success: true,
      });
      setCreateOpen(false);
      setCreatePermissions([]);
      router.refresh();
      return;
    }

    if (state.isSuccess === false && state.formErrors?.length) {
      toast.error(state.formErrors[0]);
    }
  }, [router, setCreateOpen, state, trackEvent]);

  const openEditRole = (role: RoleListItem) => {
    setEditingRole(role);
    setEditDescription(role.description ?? "");
    setEditPermissions(role.permissions.filter(isAssignablePermissionName));
  };

  const onEditPermissionChange = (permissionName: string, checked: boolean) => {
    setEditPermissions((current) => {
      if (checked) {
        return addPermission(current, permissionName);
      }

      return removePermission(current, permissionName);
    });
  };

  const onCreatePermissionChange = (
    permissionName: string,
    checked: boolean,
  ) => {
    setCreatePermissions((current) => {
      if (checked) {
        return addPermission(current, permissionName);
      }

      return removePermission(current, permissionName);
    });
  };

  const handleDelete = (roleName: string) => {
    const formData = new FormData();
    formData.set("roleName", roleName);

    startTransition(async () => {
      const result = await deleteRoleAction(initialState, formData);
      if (result.isSuccess) {
        toast.success("Role deleted");
        trackEvent("organization_role_deleted", {
          success: true,
        });
        router.refresh();
        return;
      }
      toast.error(result.formErrors?.[0] ?? "Failed to delete role");
    });
  };

  const handleUpdate = () => {
    if (!editingRole) {
      return;
    }

    const formData = new FormData();
    formData.set("roleName", editingRole.name);
    formData.set("description", editDescription);
    editPermissions.forEach((permission) =>
      formData.append("permissions", permission),
    );

    startTransition(async () => {
      const result = await updateRoleAction(initialState, formData);
      if (result.isSuccess) {
        toast.success("Role updated");
        trackEvent("organization_role_updated", {
          permission_count: editPermissions.length,
          success: true,
        });
        setEditingRole(null);
        router.refresh();
        return;
      }
      toast.error(result.formErrors?.[0] ?? "Failed to update role");
    });
  };

  return (
    <>
      <CardContent className="px-0 pb-0 sm:px-6">
        <div className="divide-y sm:hidden">
          <RolesMobileList
            canManageRoles={canManageRoles}
            hasRoles={hasRoles}
            isPending={isPending}
            onDeleteRole={handleDelete}
            onEditRole={openEditRole}
            rows={roleRows}
          />
        </div>

        <div className="hidden sm:block">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-auto whitespace-nowrap xl:w-[22%]">
                  Role Name
                </TableHead>
                <TableHead className="hidden w-[44%] whitespace-nowrap xl:table-cell">
                  Description
                </TableHead>
                <TableHead className="hidden w-36 text-right whitespace-nowrap xl:table-cell">
                  Users Assigned
                </TableHead>
                <TableHead className="w-44 text-right whitespace-nowrap">
                  Permissions
                </TableHead>
                <TableHead className="w-20 text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <RolesDesktopRows
                canManageRoles={canManageRoles}
                hasRoles={hasRoles}
                isPending={isPending}
                onDeleteRole={handleDelete}
                onEditRole={openEditRole}
                rows={roleRows}
              />
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PagedTableFooter
        {...createPagedTableFooterProps(pagedRoles, "roles", updateUrl)}
      />

      {/* Create role panel */}
      <ResponsivePanel
        desktopType="complex"
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreatePermissions([]);
          }
        }}
        trigger={<span />}
      >
        <form action={formAction} className="flex h-full min-h-0 flex-col">
          <ResponsivePanelHeader>
            <ResponsivePanelTitle>Create Role</ResponsivePanelTitle>
            <ResponsivePanelDescription>
              Create a custom tenant role and choose its permissions.
            </ResponsivePanelDescription>
          </ResponsivePanelHeader>
          <ResponsivePanelBody>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Role Name</Label>
              <Input id="name" name="name" defaultValue={state.data?.name} />
              {state.errors?.name?.[0] && (
                <p className="text-sm text-destructive">
                  {state.errors.name[0]}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={state.data?.description}
              />
            </div>
            <PermissionsChecklist
              permissions={permissions}
              selectedPermissions={createPermissions}
              onPermissionChange={onCreatePermissionChange}
            />
          </ResponsivePanelBody>
          <ResponsivePanelFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {createSubmitLabel}
            </Button>
          </ResponsivePanelFooter>
        </form>
      </ResponsivePanel>

      {/* Edit role panel */}
      <ResponsivePanel
        desktopType="complex"
        open={editingRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null);
          }
        }}
      >
        {editingRole && (
          <div className="flex h-full min-h-0 flex-col">
            <ResponsivePanelHeader>
              <ResponsivePanelTitle>Edit Role</ResponsivePanelTitle>
              <ResponsivePanelDescription>
                Update the description and permissions for {editingRole.name}.
              </ResponsivePanelDescription>
            </ResponsivePanelHeader>
            <ResponsivePanelBody>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">Role Name</Label>
                <Input
                  id="edit-name"
                  value={editingRole.name}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </div>
              <PermissionsChecklist
                permissions={permissions}
                selectedPermissions={editPermissions}
                onPermissionChange={onEditPermissionChange}
              />
            </ResponsivePanelBody>
            <ResponsivePanelFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)}>
                Cancel
              </Button>
              <Button disabled={isPending} onClick={handleUpdate}>
                {saveSubmitLabel}
              </Button>
            </ResponsivePanelFooter>
          </div>
        )}
      </ResponsivePanel>
    </>
  );
}

function roleDescription(role: RoleListItem) {
  return role.description || NO_DESCRIPTION_LABEL;
}

type RoleRowActions = {
  canManageRoles: boolean;
  isPending: boolean;
  onDeleteRole: (roleName: string) => void;
  onEditRole: (role: RoleListItem) => void;
};

function RolesMobileList({
  hasRoles,
  rows,
  ...actions
}: Readonly<
  RoleRowActions & {
    hasRoles: boolean;
    rows: RoleTableRow[];
  }
>) {
  if (!hasRoles) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {EMPTY_ROLES_MESSAGE}
      </div>
    );
  }

  return rows.map(({ permissionSummary, role, userCount }) => (
    <div key={role.id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium break-words">{role.name}</div>
          <RoleTypeBadge role={role} />
        </div>
        <RoleActionsMenu role={role} {...actions} />
      </div>
      <p className="mt-3 text-sm break-words text-muted-foreground">
        {roleDescription(role)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <UsersAssignedBadge roleName={role.name} count={userCount} />
        <RolePermissionsSummary summary={permissionSummary} />
      </div>
    </div>
  ));
}

function RolesDesktopRows({
  hasRoles,
  rows,
  ...actions
}: Readonly<
  RoleRowActions & {
    hasRoles: boolean;
    rows: RoleTableRow[];
  }
>) {
  if (!hasRoles) {
    return <TableEmptyRow colSpan={5} message={EMPTY_ROLES_MESSAGE} />;
  }

  return rows.map(({ permissionSummary, role, userCount }) => (
    <TableRow key={role.id}>
      <TableCell className="align-top break-words whitespace-normal">
        <div className="font-medium break-words">{role.name}</div>
        <RoleTypeBadge role={role} />
        <div className="mt-2 text-sm break-words whitespace-normal text-muted-foreground xl:hidden">
          {roleDescription(role)}
        </div>
        <div className="mt-2 xl:hidden">
          <UsersAssignedBadge roleName={role.name} count={userCount} />
        </div>
      </TableCell>
      <TableCell className="hidden align-top break-words whitespace-normal text-muted-foreground xl:table-cell">
        {roleDescription(role)}
      </TableCell>
      <TableCell className="hidden text-right align-top xl:table-cell">
        <UsersAssignedBadge roleName={role.name} count={userCount} />
      </TableCell>
      <TableCell className="text-right align-top break-words whitespace-normal">
        <RolePermissionsSummary summary={permissionSummary} variant="text" />
      </TableCell>
      <TableCell className="text-right align-top">
        <RoleActionsMenu role={role} {...actions} />
      </TableCell>
    </TableRow>
  ));
}

function PermissionsChecklist({
  permissions,
  selectedPermissions,
  onPermissionChange,
}: Readonly<{
  permissions: PermissionListItem[];
  selectedPermissions: string[];
  onPermissionChange: (permissionName: string, checked: boolean) => void;
}>) {
  const [search, setSearch] = useState("");
  const assignablePermissions = useMemo(
    () =>
      permissions.filter((permission) =>
        isAssignablePermissionName(permission.name),
      ),
    [permissions],
  );
  const filteredPermissions = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    if (!searchText) {
      return assignablePermissions;
    }

    return assignablePermissions.filter((permission) => {
      const categoryLabel = getPermissionCategoryLabel(permission.category);
      return (
        permission.name.toLowerCase().includes(searchText) ||
        permission.description?.toLowerCase().includes(searchText) ||
        categoryLabel.toLowerCase().includes(searchText)
      );
    });
  }, [assignablePermissions, search]);
  const groupedPermissions = useMemo(
    () => groupPermissionsByCategory(filteredPermissions),
    [filteredPermissions],
  );
  const sortedSelectedPermissions = selectedPermissions
    .slice()
    .sort((left, right) => left.localeCompare(right));
  const hasSelectedPermissions = sortedSelectedPermissions.length > 0;
  const hasGroupedPermissions = groupedPermissions.length > 0;

  let selectedPermissionsContent = (
    <p className="text-sm text-muted-foreground">No permissions selected.</p>
  );
  if (hasSelectedPermissions) {
    selectedPermissionsContent = (
      <div className="flex flex-wrap gap-2">
        {sortedSelectedPermissions.map((permissionName) => (
          <Badge
            key={permissionName}
            variant="secondary"
            className="gap-1.5 px-3 py-1.5"
          >
            {permissionName}
            <button
              type="button"
              className="rounded-full text-muted-foreground hover:text-destructive"
              onClick={() => onPermissionChange(permissionName, false)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {permissionName}</span>
            </button>
          </Badge>
        ))}
      </div>
    );
  }

  let groupedPermissionsContent = (
    <div className="p-4 text-sm text-muted-foreground">
      No permissions match your search.
    </div>
  );
  if (hasGroupedPermissions) {
    groupedPermissionsContent = (
      <>
        {groupedPermissions.map((group) => (
          <div key={group.categoryCode}>
            <div className="border-y bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
              {group.categoryLabel}
            </div>
            {group.permissions.map((permission) => {
              const isSelected = selectedPermissions.includes(permission.name);
              const rowClassName = isSelected
                ? "relative z-0 flex cursor-pointer items-start gap-3 border-b bg-primary/5 px-4 py-3 text-sm"
                : "relative z-0 flex cursor-pointer items-start gap-3 border-b bg-background px-4 py-3 text-sm hover:bg-muted/40";
              const nameClassName = isSelected
                ? "block font-medium text-primary"
                : "block font-medium";

              return (
                <label key={permission.id} className={rowClassName}>
                  <Checkbox
                    name="permissions"
                    value={permission.name}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      onPermissionChange(permission.name, checked === true)
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className={nameClassName}>{permission.name}</span>
                    {permission.description ? (
                      <span className="block text-muted-foreground">
                        {permission.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-muted/20 p-4">
      <div>
        <Label>Permissions Management</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Select specific capabilities for this role.
        </p>
      </div>

      <div className="rounded-lg border bg-background p-3">
        <div className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Active Permissions
        </div>
        {selectedPermissionsContent}
      </div>

      <div className="sticky -top-[1.25rem] z-20 -mx-4 border-y bg-muted/20 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search permissions..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        {groupedPermissionsContent}
      </div>
    </div>
  );
}

function RoleTypeBadge({ role }: Readonly<{ role: RoleListItem }>) {
  const isSystemRole = role.isSystemDefined;
  const variant = isSystemRole ? "secondary" : "outline";
  const label = isSystemRole ? "System" : "Custom";

  return (
    <Badge variant={variant} className="mt-1">
      {label}
    </Badge>
  );
}

function RoleActionsMenu({
  canManageRoles,
  isPending,
  onDeleteRole,
  onEditRole,
  role,
}: Readonly<{
  canManageRoles: boolean;
  isPending: boolean;
  onDeleteRole: (roleName: string) => void;
  onEditRole: (role: RoleListItem) => void;
  role: RoleListItem;
}>) {
  const isSystemRole = role.isSystemDefined;
  const canEdit = canManageRoles && !isSystemRole;
  const systemDisabledReason = "System roles cannot be modified";
  const permissionDisabledReason = "You don't have permission to manage roles";
  const disabledReason = isSystemRole
    ? systemDisabledReason
    : permissionDisabledReason;

  let editItem = (
    <DisabledMenuItem label="Edit Permissions" tooltip={disabledReason} />
  );
  if (canEdit) {
    editItem = (
      <DropdownMenuItem onClick={() => onEditRole(role)}>
        Edit Permissions
      </DropdownMenuItem>
    );
  }

  let deleteItem = (
    <DisabledMenuItem
      label="Delete Role"
      tooltip={disabledReason}
      destructive
    />
  );
  if (canEdit) {
    deleteItem = (
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        disabled={isPending}
        onClick={() => onDeleteRole(role.name)}
      >
        Delete Role
      </DropdownMenuItem>
    );
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal />
            <span className="sr-only">Open role actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {editItem}
          {!isSystemRole && <DropdownMenuSeparator />}
          {deleteItem}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

function UsersAssignedBadge({
  roleName,
  count,
}: Readonly<{
  roleName: string;
  count: number;
}>) {
  return (
    <Badge
      asChild
      variant="secondary"
      className="px-3 py-1 hover:bg-secondary/80"
    >
      <Link
        href={
          `/settings/organization/users?role=${encodeURIComponent(roleName)}&status=active` as Route
        }
      >
        {count} users
      </Link>
    </Badge>
  );
}

function RolePermissionsSummary({
  summary,
  variant = "badge",
}: Readonly<{
  summary: RolePermissionSummary;
  variant?: "badge" | "text";
}>) {
  if (variant === "text") {
    if (summary.kind === "effective-access") {
      return (
        <span className="inline-flex max-w-full flex-col items-end text-right text-sm leading-snug break-words text-muted-foreground">
          <RolePermissionsSummaryLabel summary={summary} />
        </span>
      );
    }

    return (
      <span className="inline-block max-w-full text-right text-sm leading-snug break-words whitespace-normal text-muted-foreground">
        {summary.label}
      </span>
    );
  }

  const badgeClassName =
    summary.kind === "effective-access"
      ? "max-w-full shrink flex-col text-center leading-snug break-words whitespace-normal"
      : "max-w-full shrink text-center leading-snug break-words whitespace-normal";

  return (
    <Badge variant="outline" className={badgeClassName}>
      <RolePermissionsSummaryLabel summary={summary} />
    </Badge>
  );
}

function RolePermissionsSummaryLabel({
  summary,
}: Readonly<{
  summary: RolePermissionSummary;
}>) {
  if (summary.kind !== "effective-access") {
    return summary.label;
  }

  return (
    <>
      <span>{summary.label.replace(" permissions", "")}</span>
      <span>permissions</span>
    </>
  );
}

function addPermission(current: string[], permissionName: string) {
  return [...new Set([...current, permissionName])];
}

function removePermission(current: string[], permissionName: string) {
  return current.filter((permission) => permission !== permissionName);
}

function getPermissionCategoryCode(permission: PermissionListItem) {
  const rawCategory = permission.category?.trim().toLowerCase();
  if (rawCategory) {
    return rawCategory;
  }

  return permission.name.split(".")[0]?.toLowerCase() || "custom";
}

function getPermissionCategoryLabel(category?: string | null) {
  const categoryCode = category?.trim().toLowerCase() || "custom";
  return permissionCategoryLabels[categoryCode] ?? categoryCode;
}

function groupPermissionsByCategory(permissions: PermissionListItem[]) {
  const groups = new Map<
    string,
    {
      categoryCode: string;
      categoryLabel: string;
      permissions: PermissionListItem[];
    }
  >();

  permissions.forEach((permission) => {
    const categoryCode = getPermissionCategoryCode(permission);
    const categoryLabel = getPermissionCategoryLabel(categoryCode);
    const group = groups.get(categoryCode) ?? {
      categoryCode,
      categoryLabel,
      permissions: [],
    };

    group.permissions.push(permission);
    groups.set(categoryCode, group);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      permissions: group.permissions.toSorted((left, right) =>
        left.name.localeCompare(right.name),
      ),
    }))
    .sort((left, right) =>
      left.categoryLabel.localeCompare(right.categoryLabel),
    );
}
