"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { getTenantSettings } from "@/services/api";
import type { TenantSettings } from "@/types";

export type GetTenantSettingsResult = Result<TenantSettings>;

export async function getTenantSettingsAction(): Promise<GetTenantSettingsResult> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const settings = await getTenantSettings();
    return Result.success(settings);
  } catch (error) {
    console.error("Failed to fetch tenant settings", error);

    let errorMessage = "Failed to fetch tenant settings";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return Result.error(errorMessage);
  }
}
