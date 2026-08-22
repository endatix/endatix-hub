import 'server-only';

import { EndatixApi } from '@/lib/endatix-api';
import type { ListSignupRequestsRequest } from '@/lib/endatix-api/signup-requests/types';
import { DataLoadError } from '@/lib/errors/data-load-error';
import { Result } from '@/lib/result';
import { toResult } from '@/lib/result/map-api-result-to-result';
import type { PlatformAdminSession } from '../types';

export async function listSignupRequests(
  session: PlatformAdminSession,
  request: ListSignupRequestsRequest,
) {
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.signupRequests.list(request);
  const result = toResult(apiResult, {
    fallbackMessage: 'Failed to load signup requests.',
    logMessage: 'Failed to load signup requests.',
    loggerName: 'platform-admin.signup-requests',
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}
