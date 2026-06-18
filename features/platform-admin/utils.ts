import { parseNumber } from "@/lib/utils/type-parsers";
import type { PlatformAdminSearchParams } from "./types";

/**
 * Parses the platform admin list search params.
 * @param searchParams - The search params to parse.
 * @returns The parsed search params.
 */
export function parsePlatformAdminListParams(
  searchParams?: PlatformAdminSearchParams,
) {
  return {
    page: parseNumber(searchParams?.page, 1),
    pageSize: parseNumber(searchParams?.pageSize, 10),
    search: searchParams?.search?.trim() || undefined,
  };
}
