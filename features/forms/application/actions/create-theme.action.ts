"use server";

import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { createTheme } from "@/services/api";
import { ITheme } from "survey-core";

export type CreateThemeRequest = ITheme;
export type CreateThemeResult = Result<{
  id: string;
  name: string;
  jsonData: string;
}>;

export async function createThemeAction(
  request: CreateThemeRequest,
): Promise<CreateThemeResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const theme = await createTheme(request);

    if (theme.id) {
      return Result.success({
        id: theme.id,
        name: theme.name,
        jsonData: theme.jsonData,
      });
    }

    return Result.error("Failed to create theme");
  } catch (error) {
    console.error("Failed to create theme", error);
    return Result.error("Failed to create theme");
  }
}
