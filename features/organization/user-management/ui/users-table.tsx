"use client";

import { use, useCallback, useEffect, useState, useTransition } from "react";
import { Info, MoreVertical, Search } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DisabledMenuItem } from "@/components/ui/disabled-menu-item";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { PagedTableFooter } from "@/components/ui/paged-table-footer";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import type {
  PagedResponse,
  RoleListItem,
  UserListItem,
} from "@/lib/endatix-api";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { getDisplayName, getInitials } from "@/features/users/user-utils";
import { CreateTenantUserDialog } from "../use-cases/create-tenant-user/ui/create-tenant-user-dialog";
import {
  deleteUserAction,
  type DeleteUserActionState,
} from "../use-cases/delete-user/delete-user.action";
import {
  resendTenantUserVerificationAction,
  type ResendVerificationActionState,
} from "../use-cases/resend-verification/resend-tenant-user-verification.action";
import {
  setUserRoleAction,
  type UserRoleActionState,
} from "../use-cases/manage-user-roles/manage-user-roles.action";
import {
  cancelTenantUserInviteAction,
  type CancelInviteActionState,
} from "../use-cases/cancel-invite/cancel-tenant-user-invite.action";

interface UsersTableProps {
  usersPromise: Promise<PagedResponse<UserListItem>>;
  currentUserId?: string;
  canInviteUsers?: boolean;
  canResendVerification?: boolean;
  canManageRoles?: boolean;
  canManageUsers?: boolean;
  availableRolesPromise?: Promise<RoleListItem[]>;
}

const emptyDeleteState: DeleteUserActionState = { isSuccess: undefined };
const emptyResendState: ResendVerificationActionState = {
  isSuccess: undefined,
};
const emptyCancelInviteState: CancelInviteActionState = {
  isSuccess: undefined,
};
const emptyUserRoleState: UserRoleActionState = { isSuccess: undefined };
const allRolesValue = "__all_roles__";
const allStatusesValue = "__all_statuses__";
const emptyRolesPromise = Promise.resolve<RoleListItem[]>([]);

export function UsersTable({
  usersPromise,
  currentUserId,
  canInviteUsers = false,
  canResendVerification = false,
  canManageRoles = false,
  canManageUsers = false,
  availableRolesPromise,
}: Readonly<UsersTableProps>) {
  const pagedUsers = normalizePagedResponse(use(usersPromise));
  const availableRoles = use(availableRolesPromise ?? emptyRolesPromise);
  const users = pagedUsers.items;
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const roleFilter = searchParams.get("role") ?? allRolesValue;
  const urlStatus = searchParams.get("status");
  const statusFilter =
    urlStatus === "active" || urlStatus === "pending"
      ? urlStatus
      : allStatusesValue;
  const [search, setSearch] = useState(urlSearch);
  const [pendingUserRemove, setPendingUserRemove] =
    useState<UserListItem | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const assignableRoles = availableRoles.filter(
    (role) => !isPlatformScopedRole(role.name),
  );

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, value);
      });

      const queryString = nextSearchParams.toString();
      const href = (
        queryString ? `${pathname}?${queryString}` : pathname
      ) as Route;
      router.replace(href, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch === urlSearch) {
      return;
    }

    const timeout = window.setTimeout(() => {
      updateUrl({
        search: trimmedSearch || null,
        page: "1",
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search, updateUrl, urlSearch]);

  const openEditRole = (user: UserListItem) => {
    setEditingUser(user);
    setSelectedRoles(user.roles.filter((role) => !isPlatformScopedRole(role)));
  };

  const toggleSelectedRole = (roleName: string, checked: boolean) => {
    setSelectedRoles((current) =>
      checked
        ? [...new Set([...current, roleName])]
        : current.filter((role) => role !== roleName),
    );
  };

  const handleRemoveAccess = (user: UserListItem) => {
    startTransition(async () => {
      const state = await deleteUserAction(emptyDeleteState, {
        userId: user.id,
      });
      if (state.isSuccess) {
        toast.success("User access removed");
        trackEvent("organization_user_access_removed", {
          success: true,
        });
        setPendingUserRemove(null);
        setDeleteConfirmEmail("");
        router.refresh();
        return;
      }

      toast.error(state.formErrors?.[0] ?? "Failed to remove user access");
    });
  };

  const handleResendVerification = (user: UserListItem) => {
    startTransition(async () => {
      const state = await resendTenantUserVerificationAction(emptyResendState, {
        userId: user.id,
        email: user.email,
      });

      if (state.isSuccess) {
        toast.success("Invite email sent");
        trackEvent("organization_user_invite_resent", {
          success: true,
        });
        return;
      }

      toast.error(
        state.formErrors?.[0] ??
          state.errors?.email?.[0] ??
          state.errors?.userId?.[0] ??
          "Failed to send invite email",
      );
    });
  };

  const handleCancelInvite = (user: UserListItem) => {
    startTransition(async () => {
      const state = await cancelTenantUserInviteAction(emptyCancelInviteState, {
        userId: user.id,
      });

      if (state.isSuccess) {
        toast.success("Invite cancelled");
        trackEvent("organization_user_invite_cancelled", {
          success: true,
        });
        router.refresh();
        return;
      }

      toast.error(state.formErrors?.[0] ?? "Failed to cancel invite");
    });
  };

  const handleSaveRole = () => {
    if (!editingUser) {
      return;
    }

    startTransition(async () => {
      const state = await setUserRoleAction(emptyUserRoleState, {
        userId: editingUser.id,
        roles: selectedRoles,
        currentRoles: editingUser.roles,
      });
      if (state.isSuccess) {
        toast.success("User role updated");
        trackEvent("organization_user_roles_updated", {
          role_count: selectedRoles.length,
          success: true,
        });
        setEditingUser(null);
        router.refresh();
        return;
      }

      toast.error(state.formErrors?.[0] ?? "Failed to update user role");
    });
  };

  const userRows = users.map((user) => {
    const displayName = getDisplayName(user.userName, user.email);
    const isYou =
      currentUserId != null && String(user.id) === String(currentUserId);
    const primaryRole = user.roles[0] ?? "No role";
    const isActive = user.isVerified;
    const isPlatformAdminUser = user.roles.some(isPlatformScopedRole);
    const canEditRoles = isActive && canManageRoles && !isPlatformAdminUser;
    const canRemoveUser = canManageUsers && !isYou && !isPlatformAdminUser;
    const canCancelInvite = !isActive && canResendVerification && !isYou;

    return {
      canCancelInvite,
      canEditRoles,
      canRemoveUser,
      displayName,
      isActive,
      isPlatformAdminUser,
      isYou,
      primaryRole,
      user,
    };
  });

  return (
    <>
      <div className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50/60 text-blue-950">
          <Info className="h-4 w-4" />
          <AlertTitle>Secure invitation flow</AlertTitle>
          <AlertDescription>
            Invited users receive a one-time activation link and choose their
            own password. Pending invites can be resent or cancelled.
          </AlertDescription>
        </Alert>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-card py-4 max-lg:sticky max-lg:top-[56px] max-lg:z-20 max-lg:shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1 lg:max-w-sm">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="pl-9 text-sm"
                />
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <Select
                  value={roleFilter}
                  onValueChange={(value) =>
                    updateUrl({
                      role: value === allRolesValue ? null : value,
                      page: "1",
                    })
                  }
                >
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
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    updateUrl({
                      status: value === allStatusesValue ? null : value,
                      page: "1",
                    })
                  }
                >
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={allStatusesValue}>
                      All statuses
                    </SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending invite</SelectItem>
                  </SelectContent>
                </Select>
                {canInviteUsers && (
                  <CreateTenantUserDialog roles={assignableRoles} />
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y lg:hidden">
              {userRows.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No users match the current filters.
                </div>
              ) : (
                userRows.map((row) => (
                  <div key={row.user.id} className="flex items-start gap-3 p-4">
                    <Avatar className="size-9 shrink-0 rounded-full">
                      <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
                        {getInitials(row.user.userName, row.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium break-words">
                            {row.displayName}
                            {row.isYou && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </div>
                          <div className="text-xs break-words text-muted-foreground">
                            {row.user.email}
                          </div>
                        </div>
                        <UserActionsMenu
                          canCancelInvite={row.canCancelInvite}
                          canEditRoles={row.canEditRoles}
                          canRemoveUser={row.canRemoveUser}
                          canResendVerification={canResendVerification}
                          isActive={row.isActive}
                          isPending={isPending}
                          isPlatformAdminUser={row.isPlatformAdminUser}
                          onCancelInvite={handleCancelInvite}
                          onEditRole={openEditRole}
                          onRemoveUser={setPendingUserRemove}
                          onResendVerification={handleResendVerification}
                          user={row.user}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge
                          variant="secondary"
                          className="max-w-full text-left break-words whitespace-normal"
                        >
                          {row.primaryRole}
                        </Badge>
                        <UserStatusBadge isActive={row.isActive} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <Table className="min-w-[42rem] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%] min-w-56 whitespace-nowrap">
                      User
                    </TableHead>
                    <TableHead className="w-[25%] min-w-36 whitespace-nowrap">
                      Role
                    </TableHead>
                    <TableHead className="w-36 whitespace-nowrap">
                      Status
                    </TableHead>
                    <TableHead className="w-20 text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-28 text-center">
                        No users match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userRows.map((row) => {
                      return (
                        <TableRow key={row.user.id}>
                          <TableCell className="break-words whitespace-normal">
                            <div className="flex min-w-0 items-start gap-3">
                              <Avatar className="size-9 shrink-0 rounded-full">
                                <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
                                  {getInitials(
                                    row.user.userName,
                                    row.user.email,
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium break-words">
                                  {row.displayName}
                                  {row.isYou && (
                                    <span className="ml-1 font-normal text-muted-foreground">
                                      (you)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs break-words text-muted-foreground">
                                  {row.user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="break-words whitespace-normal">
                            <Badge
                              variant="secondary"
                              className="max-w-full text-left break-words whitespace-normal"
                            >
                              {row.primaryRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <UserStatusBadge isActive={row.isActive} />
                          </TableCell>
                          <TableCell className="text-right">
                            <UserActionsMenu
                              canCancelInvite={row.canCancelInvite}
                              canEditRoles={row.canEditRoles}
                              canRemoveUser={row.canRemoveUser}
                              canResendVerification={canResendVerification}
                              isActive={row.isActive}
                              isPending={isPending}
                              isPlatformAdminUser={row.isPlatformAdminUser}
                              onCancelInvite={handleCancelInvite}
                              onEditRole={openEditRole}
                              onRemoveUser={setPendingUserRemove}
                              onResendVerification={handleResendVerification}
                              user={row.user}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          <PagedTableFooter
            entityLabel="users"
            page={pagedUsers.page}
            pageSize={pagedUsers.pageSize}
            totalPages={pagedUsers.totalPages}
            totalRecords={pagedUsers.totalRecords}
            hasNextPage={pagedUsers.hasNextPage}
            onPageChange={(page) => updateUrl({ page: String(page) })}
            onPageSizeChange={(pageSize) =>
              updateUrl({
                pageSize: String(pageSize),
                page: "1",
              })
            }
          />
        </Card>
      </div>

      <ResponsivePanel
        desktopType="complex"
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        {editingUser && (
          <EditUserRolesPanelContent
            assignableRoles={assignableRoles}
            editingUser={editingUser}
            isPending={isPending}
            onCancel={() => setEditingUser(null)}
            onRoleChange={toggleSelectedRole}
            onSave={handleSaveRole}
            selectedRoles={selectedRoles}
          />
        )}
      </ResponsivePanel>

      <AlertDialog
        open={pendingUserRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUserRemove(null);
            setDeleteConfirmEmail("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user access?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the user from the current organization but keeps
              their global Endatix identity. Type{" "}
              <span className="font-medium text-foreground">
                {pendingUserRemove?.email}
              </span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmEmail}
            onChange={(event) => setDeleteConfirmEmail(event.target.value)}
            placeholder={pendingUserRemove?.email}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !pendingUserRemove ||
                deleteConfirmEmail !== pendingUserRemove.email ||
                isPending
              }
              onClick={(event) => {
                event.preventDefault();
                if (pendingUserRemove) {
                  handleRemoveAccess(pendingUserRemove);
                }
              }}
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function isPlatformScopedRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.PlatformAdmin.toLowerCase();
}

function UserStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
    >
      {isActive ? "Active" : "Pending invite"}
    </Badge>
  );
}

function EditUserRolesPanelContent({
  assignableRoles,
  editingUser,
  isPending,
  onCancel,
  onRoleChange,
  onSave,
  selectedRoles,
}: Readonly<{
  assignableRoles: RoleListItem[];
  editingUser: UserListItem;
  isPending: boolean;
  onCancel: () => void;
  onRoleChange: (roleName: string, checked: boolean) => void;
  onSave: () => void;
  selectedRoles: string[];
}>) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Edit User Roles</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          Change tenant roles for this organization member.
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody className="gap-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="font-medium">
            {getDisplayName(editingUser.userName, editingUser.email)}
          </div>
          <div className="text-sm break-words text-muted-foreground">
            {editingUser.email}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Assign Roles</div>
          {assignableRoles.map((role) => {
            const isSelected = selectedRoles.includes(role.name);

            return (
              <label
                key={role.id}
                className={
                  isSelected
                    ? "flex cursor-pointer gap-4 rounded-lg border border-primary bg-primary/5 p-4"
                    : "flex cursor-pointer gap-4 rounded-lg border bg-background p-4 hover:bg-muted/40"
                }
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    onRoleChange(role.name, checked === true)
                  }
                  className="mt-1"
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium break-words">{role.name}</span>
                  <span className="text-sm break-words text-muted-foreground">
                    {role.description || "No description provided."}
                  </span>
                </span>
              </label>
            );
          })}
          {assignableRoles.length === 0 && (
            <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              No tenant-editable roles are available.
            </p>
          )}
          <Alert className="bg-muted/40">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Role changes take effect immediately after saving. The user may
              need to refresh their active session.
            </AlertDescription>
          </Alert>
        </div>
      </ResponsivePanelBody>
      <ResponsivePanelFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isPending} onClick={onSave}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </ResponsivePanelFooter>
    </div>
  );
}

function UserActionsMenu({
  canCancelInvite,
  canEditRoles,
  canRemoveUser,
  canResendVerification,
  isActive,
  isPending,
  isPlatformAdminUser,
  onCancelInvite,
  onEditRole,
  onRemoveUser,
  onResendVerification,
  user,
}: Readonly<{
  canCancelInvite: boolean;
  canEditRoles: boolean;
  canRemoveUser: boolean;
  canResendVerification: boolean;
  isActive: boolean;
  isPending: boolean;
  isPlatformAdminUser: boolean;
  onCancelInvite: (user: UserListItem) => void;
  onEditRole: (user: UserListItem) => void;
  onRemoveUser: (user: UserListItem) => void;
  onResendVerification: (user: UserListItem) => void;
  user: UserListItem;
}>) {
  const editRoleTooltip = isPlatformAdminUser
    ? "Managed at platform level"
    : !isActive
      ? "User must be active to edit roles"
      : "You don't have permission to manage roles";

  const resendInvitationTooltip = canResendVerification
    ? "User is already active"
    : "You don't have permission to resend invitations";

  const removeUserTooltip = !isActive
    ? "User has not accepted the invitation yet"
    : "You don't have permission to remove users";

  const cancelInviteTooltip = isActive
    ? "User has already accepted the invitation"
    : "You don't have permission to cancel invitations";

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical />
            <span className="sr-only">Open user actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {canEditRoles ? (
            <DropdownMenuItem onClick={() => onEditRole(user)}>
              Edit Role
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem label="Edit Role" tooltip={editRoleTooltip} />
          )}
          {isPlatformAdminUser && (
            <DropdownMenuItem disabled>
              Managed at platform level
            </DropdownMenuItem>
          )}
          {!isActive && canResendVerification ? (
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => onResendVerification(user)}
            >
              Resend Invitation
            </DropdownMenuItem>
          ) : !isActive ? (
            <DisabledMenuItem
              label="Resend Invitation"
              tooltip={resendInvitationTooltip}
            />
          ) : null}
          <DropdownMenuSeparator />
          {isActive && canRemoveUser ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onRemoveUser(user)}
            >
              Remove from Organization
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem
              label="Remove from Organization"
              tooltip={removeUserTooltip}
              destructive
            />
          )}
          {canCancelInvite ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isPending}
              onClick={() => onCancelInvite(user)}
            >
              Cancel Invitation
            </DropdownMenuItem>
          ) : (
            <DisabledMenuItem
              label="Cancel Invitation"
              tooltip={cancelInviteTooltip}
              destructive
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
