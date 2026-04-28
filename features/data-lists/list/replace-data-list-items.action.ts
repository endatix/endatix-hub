'use server';

import { auth } from '@/auth';
import { authorization } from '@/features/auth/authorization';
import { EndatixApi } from '@/lib/endatix-api';
import type {
  DataListDetails,
  DataListItem,
} from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';

export type ReplaceDataListItemsResult = Result<DataListDetails>;

export async function replaceDataListItemsAction(
  dataListId: string,
  items: DataListItem[],
): Promise<ReplaceDataListItemsResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.replaceItems(dataListId, items);

  if (!result.success) {
    return Result.error(result.error.message || 'Failed to replace data list items');
  }

  return Result.success(result.data);
}
