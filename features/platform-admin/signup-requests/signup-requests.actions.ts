'use server';

import { EndatixApi } from '@/lib/endatix-api';
import { getAllFlags } from '@/lib/feature-flags/flags';
import { Result } from '@/lib/result';
import { mapApiErrorToResult } from '@/lib/result/map-api-error-to-result';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '../require-platform-admin/require-platform-admin.server';

async function ensureSignupManagementEnabled() {
  const flags = await getAllFlags();
  if (!flags.saasManagement) {
    return Result.error('Signup requests are not enabled.');
  }

  return null;
}

export async function approveSignupRequestAction(
  signupRequestId: string,
  tenantName: string,
) {
  const guard = await ensureSignupManagementEnabled();
  if (guard) {
    return guard;
  }

  const session = await requirePlatformAdmin();
  const trimmedName = tenantName.trim();
  if (!trimmedName) {
    return Result.validationError('Tenant name is required.');
  }

  const api = new EndatixApi(session.accessToken);
  const response = await api.signupRequests.approve(signupRequestId, {
    tenantName: trimmedName,
  });

  if (!response.success) {
    return mapApiErrorToResult(response, {
      fallbackMessage: 'Failed to approve signup request.',
      preferredFields: ['tenantName'],
    });
  }

  revalidatePath('/admin/signup-requests');
  return Result.success(response.data);
}

export async function rejectSignupRequestAction(
  signupRequestId: string,
  comment: string,
) {
  const guard = await ensureSignupManagementEnabled();
  if (guard) {
    return guard;
  }

  const session = await requirePlatformAdmin();
  const trimmedComment = comment.trim();
  if (!trimmedComment) {
    return Result.validationError('Rejection comment is required.');
  }

  const api = new EndatixApi(session.accessToken);
  const response = await api.signupRequests.reject(signupRequestId, {
    comment: trimmedComment,
  });

  if (!response.success) {
    return mapApiErrorToResult(response, {
      fallbackMessage: 'Failed to reject signup request.',
      preferredFields: ['comment'],
    });
  }

  revalidatePath('/admin/signup-requests');
  return Result.success(response.data);
}
