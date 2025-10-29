"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { Result } from "@/lib/result";
import { getThemes } from "@/services/api";

export type ThemeItem = {
  id: string;
  name: string;
  description?: string;
  jsonData: string;
  createdAt?: Date;
  modifiedAt?: Date;
  formsCount?: number;
};

export type GetThemesResult = Result<ThemeItem[]>;

export async function getThemesAction(): Promise<GetThemesResult | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  try {
    const DEFAULT_THEMES_PAGE_LIMIT = 50;
    const FIRST_PAGE = 1;
    const themes = await getThemes(FIRST_PAGE, DEFAULT_THEMES_PAGE_LIMIT);
    return Result.success(themes);
  } catch (error) {
    console.error("Failed to fetch themes", error);
    return Result.error("Failed to fetch themes");
  }
}
