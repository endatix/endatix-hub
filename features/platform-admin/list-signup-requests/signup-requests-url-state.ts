import { parseSignupRequestStatusFilter } from "./parse-signup-requests-params";
import type { SignupRequestStatusFilter } from "./types";

export interface SignupRequestsUrlState {
  search: string;
  status: SignupRequestStatusFilter;
  sortBy?: string;
  sortDir?: string;
}

export function signupRequestsUrlState(
  searchParams: URLSearchParams,
): SignupRequestsUrlState {
  return {
    search: searchParams.get("search") ?? "",
    status: parseSignupRequestStatusFilter(searchParams.get("status")),
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? undefined,
  };
}
