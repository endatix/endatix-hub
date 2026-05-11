"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";

export type PatchTenantSettingsResult = Result<void>;

export async function patchTenantSettingsAction(
  requireFolderAssignment: boolean,
): Promise<PatchTenantSettingsResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);

  await requireHubAccess();
  await requirePermission(Permissions.Tenant.ManageSettings);

  const api = new EndatixApi(session?.accessToken);
  const patched = await api.tenant.patchSettings({ requireFolderAssignment });

  if (!patched.success) {
    return Result.error(
      patched.error.message || "Failed to update tenant settings",
    );
  }

  revalidatePath("/(main)/settings");
  revalidatePath("/(main)/forms");
  return Result.success(undefined);
}
