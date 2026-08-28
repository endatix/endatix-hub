"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
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

  const name = request.themeName?.trim();
  if (!name) {
    return Result.validationError("Theme name is required");
  }
  if (name.toLowerCase() === "default") {
    return Result.validationError(
      'Theme name "default" is reserved. Choose a different name.',
    );
  }

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);
  const created = await api.themes.create({
    name,
    jsonData: JSON.stringify(request),
  });

  return toResult(created, {
    fallbackMessage: "Failed to create theme",
    logMessage: "Failed to create theme",
    loggerName: "themes.create",
    mapData: (theme) => ({
      id: theme.id,
      name: theme.name,
      jsonData: theme.jsonData,
    }),
  });
}
