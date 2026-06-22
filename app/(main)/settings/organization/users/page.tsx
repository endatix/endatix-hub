import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  ListUsersRequest,
  PagedResponse,
  RoleListItem,
  UserListItem,
  UserStatusFilter,
} from "@/lib/endatix-api";
import { UsersTable } from "@/features/organization/user-management/ui/users-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "next-auth";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { Result } from "@/lib/result";
import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { DataLoadError } from "@/lib/errors/data-load-error";

async function getUsersPromise(
  request: ListUsersRequest,
  session: Session | null = null,
): Promise<PagedResponse<UserListItem>> {
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ViewUsers);

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.users.list(request);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load users.",
    logMessage: "Failed to load organization users.",
    loggerName: "organization.users",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}

async function getRolesPromise(
  session: Session | null = null,
): Promise<RoleListItem[]> {
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ViewRoles);

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.roles.list({ pageSize: 100 });
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load roles.",
    logMessage: "Failed to load organization user role filters.",
    loggerName: "organization.users",
    mapData: (data) => data.items.slice(),
  });

  if (Result.isError(result)) {
    return [];
  }

  return result.value;
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

interface SettingsOrganizationUsersPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    role?: string;
    status?: string;
  }>;
}

export default async function SettingsOrganizationUsersPage(
  props?: SettingsOrganizationUsersPageProps,
) {
  const session = await auth();
  const { requireHubAccess, evaluatePermissions } =
    await authorization(session);
  await requireHubAccess();

  const permissionsResult = await evaluatePermissions([
    Permissions.Tenant.ViewUsers,
    Permissions.Tenant.InviteUsers,
    Permissions.Tenant.ManageRoles,
    Permissions.Tenant.ManageUsers,
    Permissions.Tenant.ViewRoles,
  ]);

  if (!permissionsResult.success) {
    return <UnauthorizedComponent variant="card" />;
  }

  const permissions = permissionsResult.data;
  const canViewUsers = permissions[Permissions.Tenant.ViewUsers];
  const canInviteUsers = permissions[Permissions.Tenant.InviteUsers];
  const canManageRoles = permissions[Permissions.Tenant.ManageRoles];
  const canManageUsers = permissions[Permissions.Tenant.ManageUsers];
  const canViewRoles = permissions[Permissions.Tenant.ViewRoles];

  if (!canViewUsers) {
    return <UnauthorizedComponent variant="card" />;
  }

  const userListRequest = parseUsersSearchParams(await props?.searchParams);
  const usersPromise = getUsersPromise(userListRequest, session);
  const rolesPromise = canViewRoles
    ? getRolesPromise(session)
    : Promise.resolve([]);
  const currentUserId = session?.user?.id;

  return (
    <div className="space-y-8">
      <div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Users Directory
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Invite users, manage roles, and control access for your
            organization.
          </p>
        </div>
      </div>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable
          usersPromise={usersPromise}
          currentUserId={currentUserId}
          canResendVerification={canInviteUsers}
          canInviteUsers={canInviteUsers}
          canManageUsers={canManageUsers}
          canManageRoles={canManageRoles}
          availableRolesPromise={rolesPromise}
        />
      </Suspense>
    </div>
  );
}

function parseUsersSearchParams(searchParams?: {
  page?: string;
  pageSize?: string;
  search?: string;
  role?: string;
  status?: string;
}): ListUsersRequest {
  return {
    ...parsePagedSearchParams(searchParams, 10),
    search: searchParams?.search?.trim() || undefined,
    role: searchParams?.role?.trim() || undefined,
    status: parseStatus(searchParams?.status),
  };
}

function parseStatus(value: string | undefined): UserStatusFilter | undefined {
  if (value === "active" || value === "pending" || value === "locked") {
    return value;
  }

  return undefined;
}
