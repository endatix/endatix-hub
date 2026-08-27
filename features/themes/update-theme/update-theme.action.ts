"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
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

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);
  const updated = await api.themes.partialUpdate(request.themeId, {
    jsonData: JSON.stringify(request.theme),
  });

  return toResult(updated, {
    fallbackMessage: "Failed to update theme",
    logMessage: "Failed to update theme",
    loggerName: "themes.partialUpdate",
    mapData: (theme) => ({
      id: theme.id,
      name: theme.name,
      jsonData: theme.jsonData,
    }),
  });
}
