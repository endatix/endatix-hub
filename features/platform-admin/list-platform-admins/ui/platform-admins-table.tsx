import type {
  PagedResponse,
  PlatformAdminUserListItem,
} from "@/lib/endatix-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { grantPlatformAdminAction } from "../../grant-platform-admin/grant-platform-admin.action";
import { revokePlatformAdminAction } from "../../revoke-platform-admin/revoke-platform-admin.action";
import { formatOptionalDate } from "../../utils";

interface PlatformAdminsTableProps {
  admins: PagedResponse<PlatformAdminUserListItem>;
  candidates: PagedResponse<PlatformAdminUserListItem>;
  currentUserId?: string;
}

export function PlatformAdminsTable({
  admins,
  candidates,
  currentUserId,
}: Readonly<PlatformAdminsTableProps>) {
  return (
    <div className="space-y-6">
      <UserTable
        title="Current Platform Admins"
        users={admins}
        emptyMessage="No platform administrators found."
        actionLabel="Revoke"
        action={revokePlatformAdminAction}
        currentUserId={currentUserId}
        selfActionLabel="Current user"
        approvalBadge="Local approval"
        preventLastActionLabel="Last admin"
      />
      <UserTable
        title="Candidates"
        users={candidates}
        emptyMessage="No eligible users found."
        actionLabel="Grant"
        action={grantPlatformAdminAction}
        description="External provider roles nominate users for platform administration. Local approval grants access in Endatix."
      />
    </div>
  );
}

interface UserTableProps {
  title: string;
  users: PagedResponse<PlatformAdminUserListItem>;
  emptyMessage: string;
  actionLabel: string;
  action: (formData: FormData) => Promise<void>;
  currentUserId?: string;
  selfActionLabel?: string;
  preventLastActionLabel?: string;
  approvalBadge?: string;
  description?: string;
}

function UserTable({
  title,
  users,
  emptyMessage,
  actionLabel,
  action,
  currentUserId,
  selfActionLabel,
  preventLastActionLabel,
  approvalBadge,
  description,
}: Readonly<UserTableProps>) {
  const isLastRemainingUser = users.totalRecords === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Tenant ID</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.items.map((user) => {
              const isCurrentUser =
                currentUserId !== undefined && user.id === currentUserId;
              const isActionDisabled =
                isCurrentUser ||
                (isLastRemainingUser && preventLastActionLabel !== undefined);

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.displayName || user.userName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email || user.userName}
                    </div>
                  </TableCell>
                  <TableCell>{user.tenantName || "Unknown tenant"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.tenantId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isExternal ? "secondary" : "outline"}>
                      {user.authProvider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={user.isVerified ? "secondary" : "destructive"}
                      >
                        {user.isVerified ? "Verified" : "Pending"}
                      </Badge>
                      {user.isLockedOut && (
                        <Badge variant="destructive">Locked</Badge>
                      )}
                      <ApprovalSourceBadge
                        user={user}
                        approvalBadge={approvalBadge}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{formatOptionalDate(user.lastLoginAt)}</TableCell>
                  <TableCell className="text-right">
                    {isActionDisabled ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        title={getDisabledActionTitle(isCurrentUser)}
                      >
                        {isCurrentUser
                          ? (selfActionLabel ?? actionLabel)
                          : (preventLastActionLabel ?? actionLabel)}
                      </Button>
                    ) : (
                      <form action={action}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" variant="outline" size="sm">
                          {actionLabel}
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {users.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getDisabledActionTitle(isCurrentUser: boolean): string {
  return isCurrentUser
    ? "You cannot revoke your own platform admin access."
    : "At least one active platform administrator is required.";
}

function ApprovalSourceBadge({
  user,
  approvalBadge,
}: Readonly<{
  user: PlatformAdminUserListItem;
  approvalBadge?: string;
}>) {
  const label = getApprovalSourceLabel(user, approvalBadge);
  if (!label) {
    return null;
  }

  return <Badge variant="outline">{label}</Badge>;
}

function getApprovalSourceLabel(
  user: PlatformAdminUserListItem,
  approvalBadge?: string,
): string | null {
  if (approvalBadge) {
    return approvalBadge;
  }

  if (user.isExternal && user.hasExternalPlatformAdminRole) {
    return `${user.authProvider} requested`;
  }

  return null;
}
