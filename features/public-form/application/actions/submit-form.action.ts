"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { SubmissionData } from "@/features/submissions/types";
import { cookies } from "next/headers";
import {
  submitFormOperation,
  type SubmissionOperation,
  type SubmissionOperationResult,
} from "../submit-form-operation";

export type { SubmissionOperation, SubmissionOperationResult };

/**
 * Handles form submission by either updating an existing submission or creating a new one.
 * Uses Next.js server side processing of cookies to securely track partial submissions across requests.
 *
 * @param formId - The unique identifier of the form being submitted
 * @param submissionData - The data being submitted, including form responses and completion status
 * @param urlToken - Optional token from URL query string. When provided, cookie operations are bypassed.
 * @returns A Result indicating success or failure of the submission operation
 */
export async function submitFormAction(
  formId: string,
  submissionData: SubmissionData,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  return await submitFormOperation(
    formId,
    submissionData,
    tokenStore,
    urlToken,
  );
}
