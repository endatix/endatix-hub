import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { buildQueryEndpoint } from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import type {
  AssignRoleRequestBody,
  CreateUserRequestBody,
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
  ): Promise<ApiResult<UserListItem>> {
    return this.endatix.post<UserListItem>("/users", request);
  }

  async removeAccess(
    userId: string,
  ): Promise<ApiResult<UserOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }
    return this.endatix.delete<UserOperationResponse>(`/users/${userId}`);
  }

  async cancelInvite(
    userId: string,
  ): Promise<ApiResult<UserOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }
    return this.endatix.delete<UserOperationResponse>(
      `/users/${userId}/invite`,
    );
  }

  async resendVerification(
    userId: string,
  ): Promise<ApiResult<UserOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }
    return this.endatix.post<UserOperationResponse>(
      `/users/${userId}/resend-verification`,
      {},
    );
  }

  async assignRole(
    userId: string,
    request: AssignRoleRequestBody,
  ): Promise<ApiResult<UserOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }
    return this.endatix.post<UserOperationResponse>(
      `/users/${userId}/roles`,
      request,
    );
  }

  async removeRole(
    userId: string,
    roleName: string,
  ): Promise<ApiResult<UserOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }
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
