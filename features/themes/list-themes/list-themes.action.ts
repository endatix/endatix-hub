"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Theme } from "@/lib/endatix-api/themes/types";
import { Result, toResult } from "@/lib/result";

export type ThemeItem = Theme;

export type GetThemesResult = Result<ThemeItem[]>;

export async function getThemesAction(): Promise<GetThemesResult> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);

  // The Theme Editor dropdown has no paging affordance, so every theme is drained.
  const themes = await api.themes.listAll();

  return toResult(themes, {
    fallbackMessage: "Failed to fetch themes",
    logMessage: "Failed to fetch themes",
    loggerName: "themes.listAll",
  });
}
