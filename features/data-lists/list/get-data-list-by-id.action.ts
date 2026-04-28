'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import type { DataListDetails } from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';

export type GetDataListByIdResult = Result<DataListDetails>;

export async function getDataListByIdAction(
  dataListId: string,
): Promise<GetDataListByIdResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.getById(dataListId);

  if (!result.success) {
    return Result.error(result.error.message || 'Failed to load data list details');
  }

  return Result.success(result.data);
}
