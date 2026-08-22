import { ApiResult } from '../shared/api-result';
import { buildQueryEndpoint } from '../shared/query-params';
import type { EndatixApi } from '../endatix-api';
import type {
  ApproveSignupRequestBody,
  CreateSignupRequestBody,
  ListSignupRequestsRequest,
  RejectSignupRequestBody,
  SignupRequestAcceptedResponse,
  SignupRequestListItem,
  SignupRequestsPagedResponse,
} from './types';

export default class SignupRequests {
  constructor(private readonly endatix: EndatixApi) {}

  async create(
    request: CreateSignupRequestBody,
  ): Promise<ApiResult<SignupRequestAcceptedResponse>> {
    return this.endatix.post<SignupRequestAcceptedResponse>(
      '/public/signup-requests',
      request,
      { requireAuth: false },
    );
  }

  async list(
    request: ListSignupRequestsRequest = {},
  ): Promise<ApiResult<SignupRequestsPagedResponse>> {
    return this.endatix.get<SignupRequestsPagedResponse>(
      buildQueryEndpoint('/admin/signup-requests', [
        ['status', request.status],
        ['search', request.search],
        ['page', request.page],
        ['pageSize', request.pageSize],
        ['sortBy', request.sortBy],
        ['sortDir', request.sortDir],
      ]),
    );
  }

  async approve(
    signupRequestId: string,
    request: ApproveSignupRequestBody,
  ): Promise<ApiResult<SignupRequestListItem>> {
    return this.endatix.post<SignupRequestListItem>(
      `/admin/signup-requests/${encodeURIComponent(signupRequestId)}/approve`,
      request,
    );
  }

  async reject(
    signupRequestId: string,
    request: RejectSignupRequestBody,
  ): Promise<ApiResult<SignupRequestListItem>> {
    return this.endatix.post<SignupRequestListItem>(
      `/admin/signup-requests/${encodeURIComponent(signupRequestId)}/reject`,
      request,
    );
  }
}
