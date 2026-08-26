import type { EndatixApi } from "../endatix-api";
import type { ApiResult } from "../shared/api-result";
import { buildQueryEndpoint } from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import type {
  CreateRoleRequestBody,
  ListRolesRequest,
  PermissionListItem,
  RoleListItem,
  RoleOperationResponse,
  UpdateRoleRequestBody,
} from "./types";

export default class Roles {
  constructor(private readonly endatix: EndatixApi) {}

  async list(
    request: ListRolesRequest = {},
  ): Promise<ApiResult<PagedResponse<RoleListItem>>> {
    return this.endatix.get<PagedResponse<RoleListItem>>(
      buildListRolesEndpoint(request),
    );
  }

  async listPermissions(): Promise<ApiResult<PermissionListItem[]>> {
    return this.endatix.get<PermissionListItem[]>("/permissions");
  }

  async create(
    request: CreateRoleRequestBody,
  ): Promise<ApiResult<RoleOperationResponse>> {
    return this.endatix.post<RoleOperationResponse>("/roles", request);
  }

  async update(
    roleName: string,
    request: UpdateRoleRequestBody,
  ): Promise<ApiResult<RoleOperationResponse>> {
    return this.endatix.put<RoleOperationResponse>(
      `/roles/${encodeURIComponent(roleName)}`,
      request,
    );
  }

  async delete(roleName: string): Promise<ApiResult<RoleOperationResponse>> {
    return this.endatix.delete<RoleOperationResponse>(
      `/roles/${encodeURIComponent(roleName)}`,
    );
  }
}

function buildListRolesEndpoint(request: ListRolesRequest): string {
  return buildQueryEndpoint("/roles", [
    ["page", request.page],
    ["pageSize", request.pageSize],
    ["roleType", request.roleType],
    ["search", request.search],
    ["sortBy", request.sortBy],
    ["sortDir", request.sortDir],
  ]);
}
