"use server";

import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { updateTheme } from "@/services/api";
import { ITheme } from "survey-core";

export type UpdateThemeRequest = {
  themeId: string;
  theme: ITheme;
};

export type UpdateThemeResult = Result<{
  id: string;
  name: string;
  jsonData: string;
}>;

export async function updateThemeAction(
  request: UpdateThemeRequest,
): Promise<UpdateThemeResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const { themeId, theme } = request;
    const updatedTheme = await updateTheme(themeId, theme);

    if (updatedTheme.id) {
      return Result.success({
        id: updatedTheme.id,
        name: updatedTheme.name,
        jsonData: updatedTheme.jsonData,
      });
    }

    return Result.error("Failed to update theme");
  } catch (error) {
    console.error("Failed to update theme", error);
    return Result.error("Failed to update theme");
  }
}
