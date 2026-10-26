"use server";

import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { TelemetryLogger } from "@/features/telemetry";
import { EndatixApi } from "@/lib/endatix-api";
import {
  isNotFoundError,
  isValidationError,
} from "@/lib/endatix-api/shared/api-result";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { cookies } from "next/headers";

const LINK_NOT_VALID = "This link is not valid.";

const OPEN_LOG = {
  fallbackMessage: "The link could not be opened.",
  logMessage: "Failed to open a personalized link.",
  loggerName: "public-form.open-personal-link",
} as const;

/**
 * Redeems a personalized link without a Hub session and keeps the submission's token in the form
 * cookie, so `/share/{formId}` opens that one submission. A POST only: the link's page calls it
 * after paint, so a mail scanner's GET never marks the link Opened (endatix-hub#1211).
 *
 * An unknown link is a validation error (nothing to retry); any other error may pass on a retry.
 */
export async function openPersonalLinkAction(
  formId: string,
  token: string,
): Promise<ResultType<void>> {
  const redeemed = await new EndatixApi().audience.redeemLink(formId, token);
  const opened = toResult(redeemed, {
    ...OPEN_LOG,
    mapData: (link) => link.accessToken,
  });
  if (Result.isError(opened)) {
    const missing = isNotFoundError(redeemed) || isValidationError(redeemed);
    return missing ? Result.validationError(LINK_NOT_VALID) : opened;
  }

  const store = new FormTokenCookieStore(await cookies());
  const stored = store.setToken({ formId, token: opened.value });
  if (Result.isError(stored)) {
    TelemetryLogger.error(
      OPEN_LOG.logMessage,
      undefined,
      { reason: stored.message },
      OPEN_LOG.loggerName,
    );
    return Result.error(OPEN_LOG.fallbackMessage);
  }
  return stored;
}
