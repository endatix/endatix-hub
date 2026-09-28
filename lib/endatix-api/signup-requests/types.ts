import type { PagedResponse } from "../shared/types";

export interface CreateSignupRequestBody {
  email: string;
  companyName?: string | null;
  jobTitle?: string | null;
  postHogDistinctId?: string;
  postHogSessionId?: string;
}

export interface SignupRequestAcceptedResponse {
  message: string;
}

export interface SignupRequestListItem {
  id: string;
  email: string;
  companyName: string | null;
  status: string;
  provisioningStatus: string;
  rejectionComment: string | null;
  tenantName: string | null;
  approvedTenantId: string | null;
  decidedByUserId: string | null;
  createdAt: string;
  modifiedAt: string | null;
  decidedAt?: string | null;
  /** JSON bag. PostHog ids live here as postHogDistinctId and postHogSessionId. */
  metadata?: string | null;
  /** Server-built review links. Absent when PostHog is not configured for the UI. */
  activity?: SignupActivityLinks | null;
}

export interface SignupActivityLinks {
  sessionHref?: string;
  profileHref?: string;
}

export interface ListSignupRequestsRequest {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "email";
  sortDir?: "asc" | "desc";
}

export interface ApproveSignupRequestBody {
  tenantName: string;
}

export interface RejectSignupRequestBody {
  comment: string;
}

export type SignupRequestsPagedResponse = PagedResponse<SignupRequestListItem>;
