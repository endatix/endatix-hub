"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Theme } from "@/lib/endatix-api/themes/types";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { Result, toResult } from "@/lib/result";

export type ThemeItem = Theme;

export type ListThemesPageResult = Result<NormalizedPagedResponse<ThemeItem>>;

export async function listThemesPageAction(params: {
  page: number;
  pageSize: number;
}): Promise<ListThemesPageResult> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);

  return toResult(await api.themes.list(params), {
    fallbackMessage: "Failed to fetch themes",
    logMessage: "Failed to fetch themes",
    loggerName: "themes.list",
  });
}
