import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type {
  ListPlatformAdminsRequest,
  PlatformAdminListScope,
} from "@/lib/endatix-api/platform-admins/types";
import type { ListPlatformTenantsRequest } from "@/lib/endatix-api/platform-tenants/types";
import type {
  PlatformAdminSearchParams,
  PlatformTenantSearchParams,
} from "./types";
import { parsePlatformTenantListParams as parseTenantsListParams } from "./list-tenants/utils";

const DEFAULT_SCOPE: PlatformAdminListScope = "all";

/**
 * Parses platform admin list search params from the URL.
 */
export function parsePlatformAdminListParams(
  searchParams?: PlatformAdminSearchParams,
): ListPlatformAdminsRequest {
  return {
    ...parsePagedSearchParams(searchParams, 10),
    search: searchParams?.search?.trim() || undefined,
    scope: parseScope(searchParams?.scope),
    tenantId: searchParams?.tenantId?.trim() || undefined,
  };
}

/**
 * Parses platform tenant list search params from the URL.
 */
export function parsePlatformTenantListParams(
  searchParams?: PlatformTenantSearchParams,
): ListPlatformTenantsRequest {
  return parseTenantsListParams(searchParams);
}

function parseScope(value: string | undefined): PlatformAdminListScope {
  if (value === "approved" || value === "candidates") {
    return value;
  }

  return DEFAULT_SCOPE;
}
