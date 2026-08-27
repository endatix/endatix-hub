"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";

export type DeleteThemeResult = Result<string>;

export async function deleteThemeAction(
  themeId: string,
): Promise<DeleteThemeResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);
  const deleted = await api.themes.delete(themeId);

  return toResult<void, string>(deleted, {
    fallbackMessage: "Failed to delete theme",
    logMessage: "Failed to delete theme",
    loggerName: "themes.delete",
    mapData: () => themeId,
  });
}
