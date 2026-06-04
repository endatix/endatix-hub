import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  ListRolesRequest,
  PagedResponse,
  PermissionListItem,
  RoleListItem,
  RoleTypeFilter,
} from "@/lib/endatix-api";
import { RolesTable } from "@/features/organization/role-management/ui/roles-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { Result } from "@/lib/result";
import { parseNumber } from "@/lib/utils/type-parsers";
import { toResult } from "@/lib/result/map-api-result-to-result";

async function getRolesPromise(
  request: ListRolesRequest,
  sessionToken?: string,
): Promise<PagedResponse<RoleListItem>> {
  const api = new EndatixApi(sessionToken);
  const apiResult = await api.roles.list(request);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load roles.",
    logMessage: "Failed to load organization roles.",
    loggerName: "organization.roles",
  });

  if (Result.isError(result)) {
    throw new Error(result.message);
  }

  return result.value;
}

async function getPermissionsPromise(
  sessionToken?: string,
): Promise<PermissionListItem[]> {
  const api = new EndatixApi(sessionToken);
  const apiResult = await api.roles.listPermissions();
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load permissions.",
    logMessage: "Failed to load organization role permissions.",
    loggerName: "organization.roles",
  });

  return Result.isSuccess(result) ? result.value : [];
}

function RolesTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full sm:w-72" />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

interface SettingsOrganizationRolesPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    roleType?: string;
    search?: string;
  }>;
}

export default async function SettingsOrganizationRolesPage(
  props?: SettingsOrganizationRolesPageProps,
) {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const [viewRolesPermission, manageRolesPermission] = await Promise.all([
    checkPermission(Permissions.Tenant.ViewRoles),
    checkPermission(Permissions.Tenant.ManageRoles),
  ]);
  const canViewRoles = viewRolesPermission.success;
  const canManageRoles = manageRolesPermission.success;

  if (!canViewRoles) {
    return <UnauthorizedComponent variant="card" />;
  }

  const rolesRequest = parseRolesSearchParams(await props?.searchParams);
  const rolesPromise = getRolesPromise(rolesRequest, session?.accessToken);
  const permissionsPromise = canManageRoles
    ? getPermissionsPromise(session?.accessToken)
    : Promise.resolve([]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Roles & Permissions
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Define organization roles, review permissions, and see how many users
          are assigned to each role.
        </p>
      </div>
      <Suspense fallback={<RolesTableSkeleton />}>
        <RolesTable
          rolesPromise={rolesPromise}
          permissionsPromise={permissionsPromise}
          canManageRoles={canManageRoles}
        />
      </Suspense>
    </div>
  );
}

function parseRolesSearchParams(searchParams?: {
  page?: string;
  pageSize?: string;
  roleType?: string;
  search?: string;
}): ListRolesRequest {
  return {
    page: parseNumber(searchParams?.page) || undefined,
    pageSize: parseNumber(searchParams?.pageSize) || undefined,
    roleType: parseRoleType(searchParams?.roleType),
    search: searchParams?.search?.trim() || undefined,
  };
}

function parseRoleType(value: string | undefined): RoleTypeFilter | undefined {
  const normalizedValue = value?.trim().toLowerCase();
  if (
    normalizedValue === "all" ||
    normalizedValue === "system" ||
    normalizedValue === "custom"
  ) {
    return normalizedValue;
  }

  return undefined;
}
