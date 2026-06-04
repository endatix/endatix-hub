import type { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { buildQueryEndpoint } from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import type {
  AssignRoleRequestBody,
  CreateUserRequestBody,
  CreateUserResponse,
  ListUsersRequest,
  UserOperationResponse,
  UserListItem,
} from "./types";

export default class Users {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * List users for the current tenant.
   */
  async list(
    request: ListUsersRequest = {},
  ): Promise<ApiResult<PagedResponse<UserListItem>>> {
    return this.endatix.get<PagedResponse<UserListItem>>(
      buildListUsersEndpoint(request),
    );
  }

  async create(
    request: CreateUserRequestBody,
  ): Promise<ApiResult<CreateUserResponse>> {
    return this.endatix.post<CreateUserResponse>("/users", request);
  }

  async removeAccess(
    userId: number | string,
  ): Promise<ApiResult<UserOperationResponse>> {
    return this.endatix.delete<UserOperationResponse>(`/users/${userId}`);
  }

  async cancelInvite(
    userId: number | string,
  ): Promise<ApiResult<UserOperationResponse>> {
    return this.endatix.delete<UserOperationResponse>(
      `/users/${userId}/invite`,
    );
  }

  async resendVerification(
    userId: number | string,
  ): Promise<ApiResult<UserOperationResponse>> {
    return this.endatix.post<UserOperationResponse>(
      `/users/${userId}/resend-verification`,
      {},
    );
  }

  async assignRole(
    userId: number | string,
    request: AssignRoleRequestBody,
  ): Promise<ApiResult<UserOperationResponse>> {
    return this.endatix.post<UserOperationResponse>(
      `/users/${userId}/roles`,
      request,
    );
  }

  async removeRole(
    userId: number | string,
    roleName: string,
  ): Promise<ApiResult<UserOperationResponse>> {
    return this.endatix.delete<UserOperationResponse>(
      `/users/${userId}/roles/${encodeURIComponent(roleName)}`,
    );
  }
}

function buildListUsersEndpoint(request: ListUsersRequest): string {
  return buildQueryEndpoint("/users", [
    ["page", request.page],
    ["pageSize", request.pageSize],
    ["search", request.search],
    ["role", request.role],
    ["status", request.status],
  ]);
}
