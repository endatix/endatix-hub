'use server';

import { ensureAuthenticated } from '@/features/auth';
import { Result } from '@/lib/result';
import { createTheme } from '@/services/api';
import { ITheme } from 'survey-core';

export type CreateThemeRequest = ITheme;
export type CreateThemeResult = Result<{
  id: string;
  name: string;
  jsonData: string;
}>;

export async function createThemeAction(
  request: CreateThemeRequest
): Promise<CreateThemeResult> {
  await ensureAuthenticated();

  try {
    const theme = await createTheme(request);
    
    if (theme.id) {
      return Result.success({
        id: theme.id,
        name: theme.name,
        jsonData: theme.jsonData
      });
    }
    
    return Result.error('Failed to create theme');
  } catch (error) {
    console.error('Failed to create theme', error);
    return Result.error('Failed to create theme');
  }
} 