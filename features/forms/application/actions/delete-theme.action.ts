"use server";

import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { deleteTheme } from "@/services/api";

export type DeleteThemeResult = Result<string>;

export async function deleteThemeAction(
  themeId: string,
): Promise<DeleteThemeResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    await deleteTheme(themeId);
    return Result.success(themeId);
  } catch (error) {
    console.error("Failed to delete theme", error);
    return Result.error("Failed to delete theme");
  }
}
