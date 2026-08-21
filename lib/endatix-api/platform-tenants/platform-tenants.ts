import { ApiResult } from "../shared/api-result";
import { buildQueryEndpoint } from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import type { EndatixApi } from "../endatix-api";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type {
  CreatePlatformTenantRequest,
  ListPlatformTenantsRequest,
  PlatformTenant,
  PlatformTenantListItem,
  UpdatePlatformTenantRequest,
} from "./types";

export default class PlatformTenants {
  constructor(private readonly endatix: EndatixApi) {}

  async list(
    request: ListPlatformTenantsRequest = {},
  ): Promise<ApiResult<PagedResponse<PlatformTenantListItem>>> {
    return this.endatix.get<PagedResponse<PlatformTenantListItem>>(
      buildQueryEndpoint("/admin/tenants", [
        ["page", request.page],
        ["pageSize", request.pageSize],
        ["search", request.search],
        ["sortBy", request.sortBy],
        ["sortDir", request.sortDir],
        ["createdFrom", request.createdFrom],
        ["createdTo", request.createdTo],
        ["modifiedFrom", request.modifiedFrom],
        ["modifiedTo", request.modifiedTo],
      ]),
    );
  }

  async getById(tenantId: string): Promise<ApiResult<PlatformTenant>> {
    const idResult = validateEndatixId(String(tenantId), "tenantId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }

    return this.endatix.get<PlatformTenant>(`/admin/tenants/${idResult.value}`);
  }

  async create(
    request: CreatePlatformTenantRequest,
  ): Promise<ApiResult<PlatformTenant>> {
    return this.endatix.post<PlatformTenant>("/admin/tenants", request);
  }

  async update(
    tenantId: string,
    request: UpdatePlatformTenantRequest,
  ): Promise<ApiResult<PlatformTenant>> {
    const idResult = validateEndatixId(String(tenantId), "tenantId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }

    return this.endatix.patch<PlatformTenant>(
      `/admin/tenants/${idResult.value}`,
      request,
    );
  }
}
