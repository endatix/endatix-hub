import "server-only";

import { EndatixApi } from "@/lib/endatix-api";
import { tenantManagementFlag } from "@/lib/feature-flags/flags";
import { Result, type ResultType } from "@/lib/result";
import { requirePlatformAdmin } from "./require-platform-admin/require-platform-admin.server";

const DISABLED_MESSAGE =
  "Tenant management is not enabled for this environment.";

/**
 * Authorizes a platform admin and checks the multi-tenancy flag, returning the
 * API client to use for tenant reads and writes. Throws on missing authorization.
 */
export async function requireTenantManagement(): Promise<
  ResultType<EndatixApi>
> {
  const [session, isEnabled] = await Promise.all([
    requirePlatformAdmin(),
    tenantManagementFlag(),
  ]);

  return isEnabled
    ? Result.success(new EndatixApi(session.accessToken))
    : Result.error(DISABLED_MESSAGE);
}
