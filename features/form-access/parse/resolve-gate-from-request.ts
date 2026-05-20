import { cookies } from "next/headers";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { Result } from "@/lib/result";
import { isAccessToken } from "@/lib/utils";
import type { FormStorageGateInput } from "../types";

export interface ResolveStorageGateInputOptions {
  /**
   * When false, do not attach the FPSK submission cookie (e.g. Hub session edit of a
   * specific submission where a stale respondent cookie would mismatch submissionId).
   */
  allowCookieFallback?: boolean;
}

/** Merges body gate fields with the httpOnly submission token cookie when no token was sent. */
export async function resolveStorageGateInput(
  gate: FormStorageGateInput,
  options: ResolveStorageGateInputOptions = {},
): Promise<FormStorageGateInput> {
  if (gate.token) {
    return normalizeGateTokenType(gate);
  }

  if (options.allowCookieFallback === false) {
    return gate;
  }

  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  const cookieTokenResult = tokenStore.getToken(gate.formId);

  if (Result.isError(cookieTokenResult)) {
    return gate;
  }

  return normalizeGateTokenType({
    ...gate,
    token: cookieTokenResult.value,
    tokenType: "SubmissionToken",
  });
}

function normalizeGateTokenType(
  gate: FormStorageGateInput,
): FormStorageGateInput {
  if (!gate.token || gate.tokenType) {
    return gate;
  }

  return {
    ...gate,
    tokenType: isAccessToken(gate.token) ? "AccessToken" : "SubmissionToken",
  };
}
