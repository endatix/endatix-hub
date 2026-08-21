"use server";

import { EndatixApi } from "@/lib/endatix-api";
import type {
  PlatformTenant,
  UpdatePlatformTenantRequest,
} from "@/lib/endatix-api/platform-tenants/types";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "../require-platform-admin/require-platform-admin.server";

export async function getTenantAction(tenantId: string) {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const loaded = await api.platformTenants.getById(String(tenantId));

  if (!loaded.success) {
    return mapApiErrorToResult<PlatformTenant>(loaded, {
      fallbackMessage: "Failed to load tenant",
    });
  }

  return Result.success(loaded.data);
}

export async function updateTenantAction(
  tenantId: string,
  request: UpdatePlatformTenantRequest,
) {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const updated = await api.platformTenants.update(String(tenantId), request);

  if (!updated.success) {
    return mapApiErrorToResult(updated, {
      fallbackMessage: "Failed to update tenant",
      preferredFields: ["name", "defaultRegistrationRoleName"],
    });
  }

  revalidatePath("/admin/tenants");
  return Result.success(updated.data);
}
