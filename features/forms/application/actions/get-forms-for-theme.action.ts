"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { getForms } from "@/services/api";
import { Form } from "@/types";

export async function getFormsForThemeAction(
  themeId: string,
): Promise<Result<Form[]> | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    if (!themeId) {
      return Result.error("Theme ID is required");
    }

    const filter = `themeId:${themeId}`;
    const forms = await getForms(filter);
    return Result.success(forms);
  } catch (error) {
    console.error("Failed to get forms for theme", error);
    return Result.error("Failed to get forms for theme");
  }
}
