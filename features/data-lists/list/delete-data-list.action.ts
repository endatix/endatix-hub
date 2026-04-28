'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import { Result } from '@/lib/result';

export type DeleteDataListResult = Result<string>;

export async function deleteDataListAction(
  dataListId: string,
): Promise<DeleteDataListResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.delete(dataListId);

  if (!result.success) {
    return Result.error(result.error.message || 'Failed to delete data list');
  }

  return Result.success(result.data);
}
