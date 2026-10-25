"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { EndatixApi } from "@/lib/endatix-api";
import {
  isNotFoundError,
  isValidationError,
} from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { cookies } from "next/headers";

/** `notFound`: the link is not valid. `unavailable`: trying again may help. */
export type OpenedPersonalLink =
  | { kind: "opened" }
  | { kind: "notFound" }
  | { kind: "unavailable" };

/**
 * Redeems a personalized link without a Hub session and keeps the submission's token in the form
 * cookie, so `/share/{formId}` opens that one submission. A POST only: the link's page calls it
 * after paint, so a mail scanner's GET never marks the link Opened (endatix-hub#1211).
 */
export async function openPersonalLinkAction(
  formId: string,
  token: string,
): Promise<OpenedPersonalLink> {
  const redeemed = await new EndatixApi().audience.redeemLink(formId, token);
  if (!redeemed.success) {
    const missing = isNotFoundError(redeemed) || isValidationError(redeemed);
    return { kind: missing ? "notFound" : "unavailable" };
  }

  const store = new FormTokenCookieStore(await cookies());
  const stored = store.setToken({ formId, token: redeemed.data.accessToken });
  if (Result.isError(stored)) return { kind: "unavailable" };

  return { kind: "opened" };
}
