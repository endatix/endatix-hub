"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { PatchTenantSettingsRequest } from "@/lib/endatix-api/tenant";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";

export type PatchTenantSettingsResult = Result<void>;

export async function patchTenantSettingsAction(
  body: PatchTenantSettingsRequest,
): Promise<PatchTenantSettingsResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);

  await requireHubAccess();
  await requirePermission(Permissions.Tenant.ManageSettings);

  const api = new EndatixApi(session?.accessToken);
  const patched = await api.tenant.patchSettings(body);
  const result = toResult(patched, {
    fallbackMessage: "Failed to update tenant settings",
    logMessage: "Failed to update tenant settings",
    loggerName: "tenant.patchSettings",
    mapData: (): void => undefined,
  });

  if (Result.isSuccess(result)) {
    revalidatePath("/(main)/settings");
    revalidatePath("/(main)/forms");
  }

  return result;
}
