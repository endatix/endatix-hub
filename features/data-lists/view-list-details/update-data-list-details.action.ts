'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import type {
  DataListDetails,
  UpdateDataListDetailsRequest,
} from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';
import { toResult } from '@/lib/result/map-api-result-to-result';
import { validateEndatixId } from '@/lib/utils/type-validators';
import { revalidatePath } from 'next/cache';

export type UpdateDataListDetailsResult = Result<DataListDetails>;

export async function updateDataListDetailsAction(
  dataListId: string,
  request: UpdateDataListDetailsRequest,
): Promise<UpdateDataListDetailsResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(dataListId, 'dataListId');
  if (Result.isError(idResult)) {
    return idResult;
  }

  const name =
    request.name === undefined ? undefined : request.name.trim();
  if (name !== undefined && name.length === 0) {
    return Result.error('Name is required.');
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.updateDetails(idResult.value, {
      name,
      description: request.description,
    }),
    {
      fallbackMessage: 'Failed to update data list',
      logMessage: 'Failed to update data list details',
      loggerName: 'data-lists.updateDetails',
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath('/data-lists');
    revalidatePath(`/data-lists/${idResult.value}`);
  }

  return result;
}
