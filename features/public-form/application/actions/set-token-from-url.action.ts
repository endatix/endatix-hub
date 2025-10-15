"use server";

import { cookies } from "next/headers";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { Result } from "@/lib/result";

/**
 * Server action to set a submission token from URL parameter into cookies.
 * This enables prefilled form functionality where an external system
 * creates a submission with prefilled data and passes the token via URL.
 */
export async function setTokenFromUrlAction(
  formId: string,
  token: string,
): Promise<Result<void>> {
  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  return tokenStore.setToken({ formId, token });
}
