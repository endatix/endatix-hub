"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";

/**
 * Whether the user may rebuild reporting data. Preparing an export needs only
 * `submissions.export`; a full recompile clears flattened data, so the API
 * keeps it behind `forms.edit`.
 */
export async function canRebuildReportingDataAction(): Promise<boolean> {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canEdit = await checkPermission(Permissions.Forms.Edit);
  return canEdit.success;
}
