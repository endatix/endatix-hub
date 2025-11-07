"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { getSession } from "@/features/auth";
import { Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import type { TenantSettings } from "@/lib/endatix-api/tenant";

export type GetTenantSettingsResult = Result<TenantSettings>;

export async function getTenantSettingsAction(): Promise<GetTenantSettingsResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  const session = await getSession();
  const api = new EndatixApi(session);
  const result = await api.tenant.getSettings();

  if (!result.success) {
    console.error("Failed to fetch tenant settings", result.error);
    return Result.error(result.error.message);
  }

  return Result.success(result.data);
}
