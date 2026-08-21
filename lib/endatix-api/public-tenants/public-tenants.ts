import { ApiResult } from "../shared/api-result";
import type { EndatixApi } from "../endatix-api";
import type { PublicTenant } from "../auth/types";

export default class PublicTenants {
  constructor(private readonly endatix: EndatixApi) {}

  async getBySlug(slug: string): Promise<ApiResult<PublicTenant>> {
    return this.endatix.get<PublicTenant>(
      `/public/tenants/${encodeURIComponent(slug)}`,
      { requireAuth: false },
    );
  }
}
