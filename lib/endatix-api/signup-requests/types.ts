import type { PagedResponse } from '../shared/types';

export interface CreateSignupRequestBody {
  email: string;
  companyName?: string | null;
  honeypot?: string | null;
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
}

export interface ListSignupRequestsRequest {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'email';
  sortDir?: 'asc' | 'desc';
}

export interface ApproveSignupRequestBody {
  tenantName: string;
}

export interface RejectSignupRequestBody {
  comment: string;
}

export type SignupRequestsPagedResponse = PagedResponse<SignupRequestListItem>;
