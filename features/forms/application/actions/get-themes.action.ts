'use server';

import { ensureAuthenticated } from '@/features/auth';
import { Result } from '@/lib/result';
import { getThemes } from '@/services/api';

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

export async function getThemesAction(): Promise<GetThemesResult> {
  await ensureAuthenticated();

  try {
    const themes = await getThemes();
    return Result.success(themes);
  } catch (error) {
    console.error('Failed to fetch themes', error);
    return Result.error('Failed to fetch themes');
  }
} 