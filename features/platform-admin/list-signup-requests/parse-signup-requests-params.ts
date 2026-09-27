import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import type { ListSignupRequestsRequest } from "@/lib/endatix-api/signup-requests/types";
import {
  DEFAULT_SIGNUP_REQUEST_STATUS_FILTER,
  SIGNUP_REQUEST_STATUS_FILTERS,
  type SignupRequestStatusFilter,
  type SignupRequestsSearchParams,
} from "./types";

export function parseSignupRequestStatusFilter(
  value: string | null | undefined,
): SignupRequestStatusFilter {
  const status = value?.trim();
  return (
    SIGNUP_REQUEST_STATUS_FILTERS.find((filter) => filter === status) ??
    DEFAULT_SIGNUP_REQUEST_STATUS_FILTER
  );
}

export function parseSignupRequestsListParams(
  searchParams?: SignupRequestsSearchParams,
): ListSignupRequestsRequest {
  const paging = parsePagedSearchParams(searchParams, 20);
  const sortBy = searchParams?.sortBy === "email" ? "email" : "createdAt";
  const sortDir = searchParams?.sortDir === "asc" ? "asc" : "desc";

  return {
    ...paging,
    status: parseSignupRequestStatusFilter(searchParams?.status),
    search: searchParams?.search?.trim() || undefined,
    sortBy,
    sortDir,
  };
}
