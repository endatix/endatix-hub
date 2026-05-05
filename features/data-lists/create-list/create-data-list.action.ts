'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import type { DataListDetails } from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';

export type CreateDataListResult = Result<DataListDetails>;
const DATA_LIST_NAME_MAX_LENGTH = 100;

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

  const normalizedName = (input.name ?? '').trim().slice(0, DATA_LIST_NAME_MAX_LENGTH);
  if (!normalizedName) {
    return Result.error('Name: data list name is required.');
  }

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.create({
    ...input,
    name: normalizedName,
  });

  if (!result.success) {
    const fields = result.error.fields ?? {};
    const fieldMessages = Object.entries(fields)
      .flatMap(([field, messages]) =>
        (messages ?? []).map((message) => `${field}: ${message}`),
      )
      .join('; ');
    const details = result.error.details?.details?.trim() ?? '';
    const message =
      fieldMessages ||
      details ||
      result.error.message ||
      'Failed to create data list';
    return Result.error(message);
  }

  return Result.success(result.data);
}
