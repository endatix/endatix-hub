"use server";

import { authorization } from "@/features/auth/authorization";
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
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const PAGE_SIZE = 100;
    const themes: ThemeItem[] = [];
    let page = 1;

    for (;;) {
      const batch = await getThemes(page, PAGE_SIZE);
      themes.push(...batch);
      if (batch.length < PAGE_SIZE) {
        break;
      }
      page += 1;
    }

    return Result.success(themes);
  } catch (error) {
    console.error("Failed to fetch themes", error);
    return Result.error("Failed to fetch themes");
  }
}
