import { parseNumber } from "@/lib/utils/type-parsers";
import type {
  ListPlatformAdminsRequest,
  PlatformAdminListScope,
} from "@/lib/endatix-api/platform-admins/types";
import type { PlatformAdminSearchParams } from "./types";

const DEFAULT_SCOPE: PlatformAdminListScope = "all";

/**
 * Parses platform admin list search params from the URL.
 */
export function parsePlatformAdminListParams(
  searchParams?: PlatformAdminSearchParams,
): ListPlatformAdminsRequest {
  return {
    page: parseNumber(searchParams?.page, 1),
    pageSize: parseNumber(searchParams?.pageSize, 10),
    search: searchParams?.search?.trim() || undefined,
    scope: parseScope(searchParams?.scope),
    tenantId: searchParams?.tenantId?.trim() || undefined,
  };
}

function parseScope(value: string | undefined): PlatformAdminListScope {
  if (value === "approved" || value === "candidates") {
    return value;
  }

  return DEFAULT_SCOPE;
}
