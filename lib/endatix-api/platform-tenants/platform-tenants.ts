import type { ApiResult } from "../shared/api-result";
import { buildQueryEndpoint } from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import type { EndatixApi } from "../endatix-api";
import type {
  ListPlatformTenantsRequest,
  PlatformTenantListItem,
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
}
