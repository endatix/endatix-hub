import { ApiResult } from "../shared/api-result";
import type { EndatixApi } from "../endatix-api";
import type { PublicTenant } from "../auth/types";

type PublicTenantWire = {
  slug: string;
  name: string;
  selfRegistrationEnabled: boolean;
  allowedAuthProviders: string[];
};

export default class PublicTenants {
  constructor(private readonly endatix: EndatixApi) {}

  async getBySlug(shortUrl: string): Promise<ApiResult<PublicTenant>> {
    const result = await this.endatix.get<PublicTenantWire>(
      `/public/tenants/${encodeURIComponent(shortUrl)}`,
      { requireAuth: false },
    );
    if (!result.success) {
      return result;
    }

    const { slug, ...rest } = result.data;
    return ApiResult.success({ shortUrl: slug, ...rest });
  }
}
