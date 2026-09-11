"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Theme } from "@/lib/endatix-api/themes/types";
import { Result, toResult } from "@/lib/result";

export type GetThemeResult = Result<Theme>;

export async function getThemeAction(themeId: string): Promise<GetThemeResult> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);

  return toResult(await api.themes.get(themeId), {
    fallbackMessage: "Failed to fetch theme",
    logMessage: "Failed to fetch theme",
    loggerName: "themes.get",
  });
}
