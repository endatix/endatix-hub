import "server-only";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";

/**
 * Labels the support-access banner. A tenant the actor cannot read leaves the
 * banner unnamed rather than failing the shell it renders in.
 */
export async function getAssumedTenantName(
  accessToken: string,
  tenantId: string,
): Promise<string | undefined> {
  const tenant =
    await new EndatixApi(accessToken).platformTenants.getById(tenantId);

  return ApiResult.isSuccess(tenant) ? tenant.data.name : undefined;
}
