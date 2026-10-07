"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { Result, type ResultType } from "@/lib/result";
import { cookies } from "next/headers";

/**
 * Forgets the respondent's saved submission for this form, so the next load
 * starts a new one. The page renders without the cookie only after this runs:
 * a server component cannot delete cookies.
 */
export async function startNewResponseAction(
  formId: string,
): Promise<ResultType<void>> {
  const tokenStore = new FormTokenCookieStore(await cookies());
  return tokenStore.deleteToken(formId);
}
