"use server";

import { ensureAuthenticated } from "@/features/auth";
import { Result } from "@/lib/result";
import { getForms } from "@/services/api";
import { Form } from "@/types";

export async function getFormsForThemeAction(
  themeId: string,
): Promise<Result<Form[]>> {
  await ensureAuthenticated();

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
