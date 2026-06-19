"use client";

import { use } from "react";
import { Info, User, UserCog } from "lucide-react";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  createPagedTableFooterProps,
  PagedTableFooter,
  TableEmptyRow,
  TableSearchInput,
} from "@/components/table";
import { useDebouncedUrlSearch } from "@/lib/utils/hooks/use-debounced-url-search.hook";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createUrlFilterUpdater } from "@/lib/utils/list-table-url-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { ExternalUserBadge } from "@/features/organization/user-management/ui/external-user-badge";
import { revokePlatformAdminAction } from "../../revoke-platform-admin/revoke-platform-admin.action";
import { PlatformAdminGrantButton } from "./platform-admin-grant-button";
import { PlatformAdminUserActionButton } from "./platform-admin-user-action-button";
import type {
  PagedResponse,
  PlatformAdminUserListItem,
  PlatformTenantListItem,
} from "@/lib/endatix-api";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { getFormattedDate } from "@/lib/utils";

interface PlatformAdminsTableProps {
  usersPromise: Promise<PagedResponse<PlatformAdminUserListItem>>;
  tenantsPromise: Promise<PagedResponse<PlatformTenantListItem>>;
  approvedAdminTotalPromise: Promise<number>;
  currentUserId?: string;
  currentTenantId?: string;
}

const allScopesValue = "__all_scopes__";
const allTenantsValue = "__all_tenants__";
const emptyTenantsPromise = Promise.resolve<
  PagedResponse<PlatformTenantListItem>
>({
  items: [],
  page: 1,
  pageSize: 0,
  totalPages: 0,
  totalRecords: 0,
});

export function PlatformAdminsTable({
  usersPromise,
  tenantsPromise,
  approvedAdminTotalPromise,
  currentUserId,
  currentTenantId,
}: Readonly<PlatformAdminsTableProps>) {
  const pagedUsers = normalizePagedResponse(use(usersPromise));
  const tenants = normalizePagedResponse(
    use(tenantsPromise ?? emptyTenantsPromise),
  ).items;
  const approvedAdminTotal = use(approvedAdminTotalPromise);
  const { searchParams, updateUrl } = useUrlSearchParamsUpdater();
  const urlSearch = searchParams.get("search") ?? "";
  const urlScope = searchParams.get("scope");
  const scopeFilter =
    urlScope === "approved" || urlScope === "candidates"
      ? urlScope
      : allScopesValue;
  const tenantFilter = searchParams.get("tenantId") ?? allTenantsValue;
  const { search, setSearch } = useDebouncedUrlSearch({
    urlSearch,
    updateUrl,
  });
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
  const { trackEvent } = useTrackEvent();
  const handleRevokeSuccess = () => {
    trackEvent("platform_admin_access_revoked", { success: true });
  };

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Local PlatformAdmin approval</AlertTitle>
        <AlertDescription>
          External identity provider roles nominate users for platform
          administration. Local approval in Endatix grants or revokes platform
          access.
        </AlertDescription>
      </Alert>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-card py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email"
            />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Select value={scopeFilter} onValueChange={onScopeFilterChange}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allScopesValue}>All users</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="candidates">Candidates</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tenantFilter} onValueChange={onTenantFilterChange}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allTenantsValue}>All tenants</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                      {tenant.id === currentTenantId ? (
                        <span className="text-muted-foreground">
                          {" "}
                          (current)
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedUsers.items.map((user) => {
                  const isLocallyApproved = hasLocalPlatformAdminRole(user);
                  const isCurrentUser =
                    currentUserId !== undefined && user.id === currentUserId;
                  const isLastApprovedAdmin =
                    isLocallyApproved && approvedAdminTotal === 1;
                  const isActionDisabled =
                    isLocallyApproved && (isCurrentUser || isLastApprovedAdmin);

                  return (
                    <PlatformAdminUserRow
                      key={user.id}
                      user={user}
                      isLocallyApproved={isLocallyApproved}
                      isActionDisabled={isActionDisabled}
                      isCurrentUser={isCurrentUser}
                      isLastApprovedAdmin={isLastApprovedAdmin}
                      onRevokeSuccess={handleRevokeSuccess}
                    />
                  );
                })}
                {pagedUsers.items.length === 0 && (
                  <TableEmptyRow colSpan={6} message="No users found." />
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>

        <PagedTableFooter
          {...createPagedTableFooterProps(pagedUsers, "users", updateUrl)}
        />
      </Card>
    </div>
  );
}

function PlatformAdminUserRow({
  user,
  isLocallyApproved,
  isActionDisabled,
  isCurrentUser,
  isLastApprovedAdmin,
  onRevokeSuccess,
}: Readonly<{
  user: PlatformAdminUserListItem;
  isLocallyApproved: boolean;
  isActionDisabled: boolean;
  isCurrentUser: boolean;
  isLastApprovedAdmin: boolean;
  onRevokeSuccess: () => void;
}>) {
  const row = (
    <TableRow
      className={
        isLocallyApproved ? undefined : "bg-muted/20 hover:bg-muted/30"
      }
    >
      <TableCell>
        <div className="flex items-start gap-2.5">
          {isLocallyApproved ? (
            <UserCog
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
          ) : (
            <User
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <div className="font-medium">
              {user.displayName || user.userName}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.email || user.userName}
            </div>
            {user.isExternal ? (
              <div className="mt-1">
                <ExternalUserBadge authProvider={user.authProvider} />
              </div>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{user.tenantName || "Unknown tenant"}</div>
        <div className="text-xs text-muted-foreground">#{user.tenantId}</div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Badge variant={user.isVerified ? "secondary" : "destructive"}>
            {user.isVerified ? "Verified" : "Pending"}
          </Badge>
          {user.isLockedOut ? (
            <Badge variant="destructive">Locked</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <ApprovalBadges user={user} />
      </TableCell>
      <TableCell>{getFormattedDate(user.lastLoginAt, "Never")}</TableCell>
      <TableCell className="text-right">
        {isActionDisabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            title={getDisabledActionTitle(isCurrentUser, isLastApprovedAdmin)}
          >
            {isCurrentUser ? "Current user" : "Last admin"}
          </Button>
        ) : isLocallyApproved ? (
          <PlatformAdminUserActionButton
            userId={user.id}
            actionLabel="Revoke"
            pendingLabel="Revoking..."
            fallbackErrorMessage="Failed to revoke platform administrator access."
            action={revokePlatformAdminAction}
            onSuccess={onRevokeSuccess}
          />
        ) : (
          <PlatformAdminGrantButton user={user} />
        )}
      </TableCell>
    </TableRow>
  );

  if (isLocallyApproved) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        Grant platform admin access to allow this user to manage all tenants,
        organizations, and platform settings.
      </TooltipContent>
    </Tooltip>
  );
}

function hasLocalPlatformAdminRole(user: PlatformAdminUserListItem): boolean {
  return user.roles.includes(SystemRoles.PlatformAdmin);
}

function ApprovalBadges({
  user,
}: Readonly<{ user: PlatformAdminUserListItem }>) {
  const badges = [];

  if (hasLocalPlatformAdminRole(user)) {
    badges.push(
      <Badge key="local" variant="default">
        Local approval
      </Badge>,
    );
  }

  if (user.isExternal && user.hasExternalPlatformAdminRole) {
    badges.push(
      <Badge key="external" variant="outline">
        {user.authProvider} requested
      </Badge>,
    );
  }

  if (badges.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Grant required</span>
    );
  }

  return <div className="flex flex-wrap gap-2">{badges}</div>;
}

function getDisabledActionTitle(
  isCurrentUser: boolean,
  isLastApprovedAdmin: boolean,
): string {
  if (isCurrentUser) {
    return "You cannot revoke your own platform admin access.";
  }

  if (isLastApprovedAdmin) {
    return "At least one active platform administrator is required.";
  }

  return "";
}
