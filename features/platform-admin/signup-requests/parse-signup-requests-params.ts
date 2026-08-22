import { parsePagedSearchParams } from '@/lib/list-page/parse-paged-search-params';
import type { ListSignupRequestsRequest } from '@/lib/endatix-api/signup-requests/types';
import type { SignupRequestsSearchParams } from './types';

export function parseSignupRequestsListParams(
  searchParams?: SignupRequestsSearchParams,
): ListSignupRequestsRequest {
  const paging = parsePagedSearchParams(searchParams, 20);
  const sortBy = searchParams?.sortBy === 'email' ? 'email' : 'createdAt';
  const sortDir = searchParams?.sortDir === 'asc' ? 'asc' : 'desc';

  return {
    ...paging,
    status: searchParams?.status?.trim() || 'pending',
    search: searchParams?.search?.trim() || undefined,
    sortBy,
    sortDir,
  };
}
