import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type {
  ListPlatformAdminsRequest,
  PlatformAdminListScope,
} from "@/lib/endatix-api/platform-admins/types";
import { firstSearchParam } from "@/lib/utils/next-utils";
import type { PlatformAdminSearchParams } from "./types";

const DEFAULT_SCOPE: PlatformAdminListScope = "all";

/**
 * Parses platform admin list search params from the URL.
 */
export function parsePlatformAdminListParams(
  searchParams?: PlatformAdminSearchParams,
): ListPlatformAdminsRequest {
  return {
    ...parsePagedSearchParams(
      {
        page: firstSearchParam(searchParams?.page),
        pageSize: firstSearchParam(searchParams?.pageSize),
      },
      10,
    ),
    search: firstSearchParam(searchParams?.search)?.trim() || undefined,
    scope: parseScope(firstSearchParam(searchParams?.scope)),
    tenantId: firstSearchParam(searchParams?.tenantId)?.trim() || undefined,
  };
}

function parseScope(value: string | undefined): PlatformAdminListScope {
  if (value === "approved" || value === "candidates") {
    return value;
  }

  return DEFAULT_SCOPE;
}
