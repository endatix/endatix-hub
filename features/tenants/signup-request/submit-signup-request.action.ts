'use server';

import { EndatixApi } from '@/lib/endatix-api';
import { Result, type ResultType } from '@/lib/result';
import { mapApiErrorToResult } from '@/lib/result/map-api-error-to-result';

const GENERIC_SUCCESS_MESSAGE =
  'If your request is accepted, we will contact you at the email address provided.';

type SignupRequestResult = { message: string };

export async function submitSignupRequestAction(
  formData: FormData,
): Promise<ResultType<SignupRequestResult>> {
  const honeypot = formData.get('website')?.toString() ?? '';
  if (honeypot.trim().length > 0) {
    return Result.success({ message: GENERIC_SUCCESS_MESSAGE });
  }

  const email = formData.get('email')?.toString().trim() ?? '';
  const companyName = formData.get('companyName')?.toString().trim() || null;

  if (!email) {
    return Result.validationError<SignupRequestResult>('Email is required.');
  }

  const api = new EndatixApi();
  const response = await api.signupRequests.create({
    email,
    companyName,
    honeypot: honeypot || null,
  });

  if (!response.success) {
    return mapApiErrorToResult<SignupRequestResult>(response, {
      fallbackMessage: GENERIC_SUCCESS_MESSAGE,
      preferredFields: ['email'],
    });
  }

  return Result.success({
    message: response.data.message || GENERIC_SUCCESS_MESSAGE,
  });
}
