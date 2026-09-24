"use client";

import { use, useState, useTransition, type ReactNode } from "react";
import { Info, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { ExternalUserBadge } from "./external-user-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import {
  createPagedTableFooterProps,
  PagedTableFooter,
  TableEmptyRow,
} from "@/components/table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { isPlatformScopedRole } from "./platform-scoped-role";
import type {
  PagedResponse,
  RoleListItem,
  UserListItem,
} from "@/lib/endatix-api";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import {
  getUserListDisplayName,
  getUserListInitials,
} from "@/features/users/user-utils";
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
import {
  lockoutUserAction,
  unlockUserAction,
  type UserLockoutActionState,
} from "../use-cases/manage-user-lockout/manage-user-lockout.action";
import {
  getUserActionPolicy,
  type UserActionAvailability,
  type UserActionPolicy,
} from "./user-action-policy";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { Result, type ResultType } from "@/lib/result";

interface UsersTableProps {
  usersPromise: Promise<ResultType<PagedResponse<UserListItem>>>;
  /** From the list shell's `useListUrlState`. The table never owns a URL writer. */
  updateUrl: UrlSearchParamsUpdater;
  currentUserId?: string;
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
const emptyUserLockoutState: UserLockoutActionState = { isSuccess: undefined };
const emptyRolesPromise = Promise.resolve<RoleListItem[]>([]);
const NO_EMAIL_LABEL = "No email from identity provider";

type UserTableRow = {
  actionPolicy: UserActionPolicy;
  displayName: string;
  initials: string;
  isActive: boolean;
  isYou: boolean;
  user: UserListItem;
};

export function UsersTable({
  usersPromise,
  updateUrl,
  currentUserId,
  canResendVerification = false,
  canManageRoles = false,
  canManageUsers = false,
  availableRolesPromise,
}: Readonly<UsersTableProps>) {
  const usersResult = use(usersPromise);

  if (Result.isError(usersResult)) {
    return <HubPageLoadError result={usersResult} />;
  }

  return (
    <UsersTableContent
      pagedUsers={normalizePagedResponse(usersResult.value)}
      updateUrl={updateUrl}
      currentUserId={currentUserId}
      canResendVerification={canResendVerification}
      canManageRoles={canManageRoles}
      canManageUsers={canManageUsers}
      availableRolesPromise={availableRolesPromise}
    />
  );
}

type UsersTableContentProps = Omit<UsersTableProps, "usersPromise"> & {
  pagedUsers: ReturnType<typeof normalizePagedResponse<UserListItem>>;
};

function UsersTableContent({
  pagedUsers,
  updateUrl,
  currentUserId,
  canResendVerification = false,
  canManageRoles = false,
  canManageUsers = false,
  availableRolesPromise,
}: Readonly<UsersTableContentProps>) {
  const router = useRouter();
  const availableRoles = use(availableRolesPromise ?? emptyRolesPromise);
  const users = pagedUsers.items;
  const { trackEvent } = useTrackEvent();
  const [pendingUserRemove, setPendingUserRemove] =
    useState<UserListItem | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const assignableRoles = availableRoles.filter(
    (role) => !isPlatformScopedRole(role.name),
  );

  const openEditRole = (user: UserListItem) => {
    setEditingUser(user);
    setSelectedRoles(user.roles.filter((role) => !isPlatformScopedRole(role)));
  };

  const toggleSelectedRole = (roleName: string, checked: boolean) => {
    setSelectedRoles((current) => {
      if (checked) {
        return [...new Set([...current, roleName])];
      }

      return current.filter((role) => role !== roleName);
    });
  };

  const handleRemoveAccess = (user: UserListItem) => {
    startTransition(async () => {
      const state = await deleteUserAction(emptyDeleteState, {
        userId: user.id,
        confirmationEmail: deleteConfirmEmail,
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
        email: user.email ?? "",
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

  const handleToggleLockout = (user: UserListItem) => {
    startTransition(async () => {
      const action = user.isLockedOut ? unlockUserAction : lockoutUserAction;
      const successMessage = user.isLockedOut
        ? "User unlocked"
        : "User locked out";
      const failureMessage = user.isLockedOut
        ? "Failed to unlock user"
        : "Failed to lock out user";
      const state = await action(emptyUserLockoutState, {
        userId: user.id,
      });

      if (state.isSuccess) {
        toast.success(state.message ?? successMessage);
        trackEvent("organization_user_lockout_changed", {
          locked: !user.isLockedOut,
          success: true,
        });
        router.refresh();
        return;
      }

      toast.error(state.formErrors?.[0] ?? failureMessage);
    });
  };

  const userRows: UserTableRow[] = users.map((user) => {
    const displayName = getUserListDisplayName(user);
    const isYou = currentUserId != null && user.id === currentUserId;
    const isActive = user.isVerified && !user.isLockedOut;
    const isPlatformAdminUser = user.roles.some(isPlatformScopedRole);
    const actionPolicy = getUserActionPolicy({
      isActive,
      isYou,
      isPlatformAdminUser,
      isExternal: user.isExternal,
      isLockedOut: user.isLockedOut,
      canManageRoles,
      canManageUsers,
      canManageInvitations: canResendVerification,
    });

    return {
      actionPolicy,
      displayName,
      initials: getUserListInitials(user),
      isActive,
      isYou,
      user,
    };
  });
  const hasUsers = userRows.length > 0;
  const removeConfirmEmail = pendingUserRemove?.email ?? "the user's email";
  const removeConfirmPlaceholder = pendingUserRemove?.email ?? "";
  const canConfirmRemove =
    pendingUserRemove !== null &&
    pendingUserRemove.email !== null &&
    deleteConfirmEmail === pendingUserRemove.email &&
    !isPending;

  return (
    <>
      <CardContent className="p-0">
        <div className="divide-y lg:hidden">
          <UsersMobileList
            hasUsers={hasUsers}
            isPending={isPending}
            onCancelInvite={handleCancelInvite}
            onEditRole={openEditRole}
            onLockout={handleToggleLockout}
            onRemoveUser={setPendingUserRemove}
            onResendVerification={handleResendVerification}
            rows={userRows}
          />
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <Table className="min-w-[42rem] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%] min-w-56 whitespace-nowrap">
                  User
                </TableHead>
                <TableHead className="w-[25%] min-w-36 whitespace-nowrap">
                  Roles
                </TableHead>
                <TableHead className="w-36 whitespace-nowrap">Status</TableHead>
                <TableHead className="w-20 text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <UsersDesktopRows
                hasUsers={hasUsers}
                isPending={isPending}
                onCancelInvite={handleCancelInvite}
                onEditRole={openEditRole}
                onLockout={handleToggleLockout}
                onRemoveUser={setPendingUserRemove}
                onResendVerification={handleResendVerification}
                rows={userRows}
              />
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PagedTableFooter
        {...createPagedTableFooterProps(pagedUsers, "users", updateUrl)}
      />

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
                {removeConfirmEmail}
              </span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmEmail}
            onChange={(event) => setDeleteConfirmEmail(event.target.value)}
            placeholder={removeConfirmPlaceholder}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canConfirmRemove}
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

function UserStatusBadge({
  isActive,
  isLockedOut,
}: Readonly<{
  isActive: boolean;
  isLockedOut: boolean;
}>) {
  if (isLockedOut) {
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-50 text-red-700"
      >
        Locked out
      </Badge>
    );
  }

  const label = isActive ? "Active" : "Pending invite";
  const className = isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

type UserRowActions = {
  isPending: boolean;
  onCancelInvite: (user: UserListItem) => void;
  onEditRole: (user: UserListItem) => void;
  onLockout: (user: UserListItem) => void;
  onRemoveUser: (user: UserListItem) => void;
  onResendVerification: (user: UserListItem) => void;
};

function UserIdentity({
  displayName,
  email,
  initials,
  isYou,
  showExternalBadge = false,
  authProvider,
}: Readonly<{
  displayName: string;
  email: string | null;
  initials: string;
  isYou: boolean;
  showExternalBadge?: boolean;
  authProvider?: string | null;
}>) {
  const emailLabel = email ?? NO_EMAIL_LABEL;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar className="size-9 shrink-0 rounded-full">
        <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <UserIdentityText
        authProvider={authProvider}
        displayName={displayName}
        emailLabel={emailLabel}
        isYou={isYou}
        showExternalBadge={showExternalBadge}
      />
    </div>
  );
}

function UserIdentityText({
  authProvider,
  displayName,
  emailLabel,
  isYou,
  showExternalBadge,
}: Readonly<{
  authProvider?: string | null;
  displayName: string;
  emailLabel: string;
  isYou: boolean;
  showExternalBadge: boolean;
}>) {
  let externalBadge: ReactNode = null;
  if (showExternalBadge && authProvider) {
    externalBadge = (
      <div className="mt-1">
        <ExternalUserBadge authProvider={authProvider} />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="font-medium break-words">
        {displayName}
        {isYou ? (
          <span className="ml-1 font-normal text-muted-foreground">(you)</span>
        ) : null}
      </div>
      <div className="text-xs break-words text-muted-foreground">
        {emailLabel}
      </div>
      {externalBadge}
    </div>
  );
}

function UsersMobileList({
  hasUsers,
  rows,
  ...actions
}: Readonly<
  UserRowActions & {
    hasUsers: boolean;
    rows: UserTableRow[];
  }
>) {
  if (!hasUsers) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No users match the current filters.
      </div>
    );
  }

  return rows.map((row) => {
    const emailLabel = row.user.email ?? NO_EMAIL_LABEL;

    return (
      <div key={row.user.id} className="flex items-start gap-3 p-4">
        <Avatar className="size-9 shrink-0 rounded-full">
          <AvatarFallback className="rounded-full bg-muted text-sm font-medium">
            {row.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <UserIdentityText
              displayName={row.displayName}
              emailLabel={emailLabel}
              isYou={row.isYou}
              showExternalBadge={false}
            />
            <UserActionsMenu
              actionPolicy={row.actionPolicy}
              user={row.user}
              {...actions}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <UserRolesBadges maxVisible={4} roles={row.user.roles} />
            {row.user.isExternal ? (
              <ExternalUserBadge authProvider={row.user.authProvider} />
            ) : null}
            <UserStatusBadge
              isActive={row.isActive}
              isLockedOut={row.user.isLockedOut}
            />
          </div>
        </div>
      </div>
    );
  });
}

function UsersDesktopRows({
  hasUsers,
  rows,
  ...actions
}: Readonly<
  UserRowActions & {
    hasUsers: boolean;
    rows: UserTableRow[];
  }
>) {
  if (!hasUsers) {
    return (
      <TableEmptyRow
        colSpan={4}
        message="No users match the current filters."
        className="h-28"
      />
    );
  }

  return rows.map((row) => (
    <TableRow key={row.user.id}>
      <TableCell className="break-words whitespace-normal">
        <UserIdentity
          authProvider={row.user.authProvider}
          displayName={row.displayName}
          email={row.user.email}
          initials={row.initials}
          isYou={row.isYou}
          showExternalBadge={row.user.isExternal}
        />
      </TableCell>
      <TableCell className="break-words whitespace-normal">
        <UserRolesBadges maxVisible={3} roles={row.user.roles} />
      </TableCell>
      <TableCell>
        <UserStatusBadge
          isActive={row.isActive}
          isLockedOut={row.user.isLockedOut}
        />
      </TableCell>
      <TableCell className="text-right">
        <UserActionsMenu
          actionPolicy={row.actionPolicy}
          user={row.user}
          {...actions}
        />
      </TableCell>
    </TableRow>
  ));
}

function UserRolesBadges({
  maxVisible,
  roles,
}: Readonly<{
  maxVisible: number;
  roles: readonly string[];
}>) {
  if (roles.length === 0) {
    return (
      <Badge
        variant="outline"
        className="max-w-full text-left break-words whitespace-normal text-muted-foreground"
      >
        No roles
      </Badge>
    );
  }

  const visibleRoles = roles.slice(0, maxVisible);
  const hiddenRoles = roles.slice(maxVisible);

  return (
    <div className="flex max-w-full flex-wrap gap-1.5">
      {visibleRoles.map((role) => (
        <Badge
          key={role}
          variant="secondary"
          className="max-w-full text-left break-words whitespace-normal"
        >
          {role}
        </Badge>
      ))}
      {hiddenRoles.length > 0 && <MoreRolesBadge roles={hiddenRoles} />}
    </div>
  );
}

function MoreRolesBadge({ roles }: Readonly<{ roles: readonly string[] }>) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="max-w-full cursor-default text-left break-words whitespace-normal"
          >
            +{roles.length} more
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <span key={role}>{role}</span>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const saveLabel = isPending ? "Saving..." : "Save Changes";
  const editingEmailLabel = editingUser.email ?? NO_EMAIL_LABEL;

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
            {getUserListDisplayName(editingUser)}
          </div>
          <div className="text-sm break-words text-muted-foreground">
            {editingEmailLabel}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Assign Roles</div>
          {assignableRoles.map((role) => {
            const isSelected = selectedRoles.includes(role.name);
            const roleOptionClassName = isSelected
              ? "flex cursor-pointer gap-4 rounded-lg border border-primary bg-primary/5 p-4"
              : "flex cursor-pointer gap-4 rounded-lg border bg-background p-4 hover:bg-muted/40";
            const roleDescription =
              role.description || "No description provided.";

            return (
              <label key={role.id} className={roleOptionClassName}>
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
                    {roleDescription}
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
          {saveLabel}
        </Button>
      </ResponsivePanelFooter>
    </div>
  );
}

function UserActionsMenu({
  actionPolicy,
  isPending,
  onCancelInvite,
  onEditRole,
  onLockout,
  onRemoveUser,
  onResendVerification,
  user,
}: Readonly<{
  actionPolicy: UserActionPolicy;
  isPending: boolean;
  onCancelInvite: (user: UserListItem) => void;
  onEditRole: (user: UserListItem) => void;
  onLockout: (user: UserListItem) => void;
  onRemoveUser: (user: UserListItem) => void;
  onResendVerification: (user: UserListItem) => void;
  user: UserListItem;
}>) {
  const hasPrimaryActions =
    actionPolicy.editRole.status !== "hidden" ||
    actionPolicy.resendInvitation.status !== "hidden";
  const hasDestructiveActions =
    actionPolicy.removeFromOrganization.status !== "hidden" ||
    actionPolicy.cancelInvitation.status !== "hidden" ||
    actionPolicy.lockout.status !== "hidden";
  const lockoutLabel = user.isLockedOut ? "Unlock User" : "Lock Out User";

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
          <UserActionMenuItem
            action={actionPolicy.editRole}
            label="Edit Role"
            onSelect={() => onEditRole(user)}
          />
          <UserActionMenuItem
            action={actionPolicy.resendInvitation}
            disabled={isPending}
            label="Resend Invitation"
            onSelect={() => onResendVerification(user)}
          />
          {hasPrimaryActions && hasDestructiveActions && (
            <DropdownMenuSeparator />
          )}
          <UserActionMenuItem
            action={actionPolicy.lockout}
            destructive={!user.isLockedOut}
            disabled={isPending}
            label={lockoutLabel}
            onSelect={() => onLockout(user)}
          />
          <UserActionMenuItem
            action={actionPolicy.removeFromOrganization}
            destructive
            label="Remove from Organization"
            onSelect={() => onRemoveUser(user)}
          />
          <UserActionMenuItem
            action={actionPolicy.cancelInvitation}
            destructive
            disabled={isPending}
            label="Cancel Invitation"
            onSelect={() => onCancelInvite(user)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}

function UserActionMenuItem({
  action,
  destructive,
  disabled,
  label,
  onSelect,
}: Readonly<{
  action: UserActionAvailability;
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onSelect: () => void;
}>) {
  if (action.status === "hidden") {
    return null;
  }

  if (action.status === "disabled") {
    return (
      <DisabledMenuItem
        destructive={destructive}
        label={label}
        tooltip={action.tooltip}
      />
    );
  }

  const itemClassName = destructive
    ? "text-destructive focus:text-destructive"
    : undefined;

  return (
    <DropdownMenuItem
      className={itemClassName}
      disabled={disabled}
      onClick={onSelect}
    >
      {label}
    </DropdownMenuItem>
  );
}
