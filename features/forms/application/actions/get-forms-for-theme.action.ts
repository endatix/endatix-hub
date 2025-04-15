"use server";

import { ensureAuthenticated } from "@/features/auth";
import { Result } from "@/lib/result";
import { getFormsForTheme } from "@/services/api";
import { Form } from "@/types";

export async function getFormsForThemeAction(
  themeId: string,
): Promise<Result<Form[]>> {
  await ensureAuthenticated();

  try {
    const forms = await getFormsForTheme(themeId);
    return Result.success(forms);
  } catch (error) {
    console.error("Failed to get forms for theme", error);
    return Result.error("Failed to get forms for theme");
  }
}
