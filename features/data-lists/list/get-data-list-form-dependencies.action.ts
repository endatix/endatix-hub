'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import type { FormDependencySummary } from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';

export type GetDataListFormDependenciesResult = Result<FormDependencySummary[]>;

export async function getDataListFormDependenciesAction(
  dataListId: string,
): Promise<GetDataListFormDependenciesResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.listFormDependencies(dataListId);

  if (!result.success) {
    return Result.error(result.error.message || 'Failed to load dependencies');
  }

  return Result.success(result.data);
}
