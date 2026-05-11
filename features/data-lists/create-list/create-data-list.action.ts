'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import type { DataListDetails } from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';

export type CreateDataListResult = Result<DataListDetails>;

interface CreateDataListInput {
  name: string;
  description?: string;
}

export async function createDataListAction(
  input: CreateDataListInput,
): Promise<CreateDataListResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.create(input);

  if (!result.success) {
    return Result.error(result.error.message || 'Failed to create data list');
  }

  return Result.success(result.data);
}
