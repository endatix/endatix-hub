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
import { RolesList } from "@/features/organization/role-management/ui/roles-list";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { Result } from "@/lib/result";
import { parseNumber } from "@/lib/utils/type-parsers";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { DataLoadError } from "@/lib/errors/data-load-error";

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
    throw new DataLoadError(result.message);
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
  const { requireHubAccess, evaluatePermissions } =
    await authorization(session);
  await requireHubAccess();

  const permissionsResult = await evaluatePermissions([
    Permissions.Tenant.ViewRoles,
    Permissions.Tenant.ManageRoles,
  ]);

  if (!permissionsResult.success) {
    return <UnauthorizedComponent variant="card" />;
  }

  const permissions = permissionsResult.data;
  const canViewRoles = permissions[Permissions.Tenant.ViewRoles];
  const canManageRoles = permissions[Permissions.Tenant.ManageRoles];

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
      <RolesList
        rolesPromise={rolesPromise}
        permissionsPromise={permissionsPromise}
        listKey={listQueryKey(rolesRequest)}
        canManageRoles={canManageRoles}
      />
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
