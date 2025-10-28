"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { deleteTheme } from "@/services/api";

export type DeleteThemeResult = Result<string>;

export async function deleteThemeAction(
  themeId: string,
): Promise<DeleteThemeResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    await deleteTheme(themeId);
    return Result.success(themeId);
  } catch (error) {
    console.error("Failed to delete theme", error);
    return Result.error("Failed to delete theme");
  }
}
