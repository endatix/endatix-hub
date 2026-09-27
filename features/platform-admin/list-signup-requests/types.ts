export const SIGNUP_REQUEST_STATUS_FILTERS = [
  "pending",
  "approved",
  "rejected",
  "all",
] as const;

export type SignupRequestStatusFilter =
  (typeof SIGNUP_REQUEST_STATUS_FILTERS)[number];

/** The inbox opens on the requests that still need a decision. */
export const DEFAULT_SIGNUP_REQUEST_STATUS_FILTER: SignupRequestStatusFilter =
  "pending";

export interface SignupRequestsSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}
