"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { readPublicEndatixEnv } from "@/features/config/client-endatix-config";
import { EndatixApi } from "@/lib/endatix-api";
import type { CreateSignupRequestBody } from "@/lib/endatix-api/signup-requests/types";
import {
  saasManagementFlag,
  termsAcceptanceEnabled,
} from "@/lib/feature-flags/flags";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { getStringFormValue } from "@/lib/utils/form-data-utils";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

/** Matches the API allowlist. Longer values are dropped, not rejected. */
const POSTHOG_ID_MAX_LENGTH = 200;

function boundedPostHogId(formData: FormData, key: string): string {
  const value = getStringFormValue(formData, key).trim();
  return value.length <= POSTHOG_ID_MAX_LENGTH ? value : "";
}

const GENERIC_SUCCESS_MESSAGE =
  "If your request is accepted, we will contact you at the email address provided.";

const requestAccepted = { isSuccess: true, message: GENERIC_SUCCESS_MESSAGE } as const;

const versionSchema = createEndatixIdSchema("Terms version");
const signupRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email address." })),
  companyName: z
    .string()
    .trim()
    .transform((value) => value || null),
});

type SignupRequestData = {
  email?: string;
  companyName?: string;
};

export type SignupRequestActionState = ServerActionState<SignupRequestData>;

function analyticsFields(formData: FormData) {
  if (!readPublicEndatixEnv().posthogProjectToken) return {};
  const postHogDistinctId = boundedPostHogId(formData, "postHogDistinctId");
  const postHogSessionId = boundedPostHogId(formData, "postHogSessionId");
  return {
    ...(postHogDistinctId && { postHogDistinctId }),
    ...(postHogSessionId && { postHogSessionId }),
  };
}

export async function submitSignupRequestAction(
  _prevState: SignupRequestActionState,
  formData: FormData,
): Promise<SignupRequestActionState> {
  if (!(await saasManagementFlag())) {
    return ServerActionState.fromFailure(
      "Signup is not enabled for this environment.",
    );
  }

  if (getStringFormValue(formData, "website").trim().length > 0) {
    return requestAccepted;
  }

  const rawData: SignupRequestData = {
    email: getStringFormValue(formData, "email"),
    companyName: getStringFormValue(formData, "companyName"),
  };

  const validated = signupRequestSchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const selected = formData.get("acceptedTermsVersionId");
  const version =
    selected !== null && (await termsAcceptanceEnabled())
      ? versionSchema.safeParse(selected)
      : undefined;
  if (version && !version.success) {
    refresh();
    return ServerActionState.fromFailure(
      "Review the current Terms and try again.",
      rawData,
    );
  }

  return createRequest(
    {
      ...validated.data,
      ...(version && { acceptedTermsVersionId: version.data }),
      ...analyticsFields(formData),
    },
    rawData,
  );
}

async function createRequest(
  body: CreateSignupRequestBody,
  rawData: SignupRequestData,
): Promise<SignupRequestActionState> {
  const result = toResult(await new EndatixApi().signupRequests.create(body), {
    fallbackMessage: "We could not submit your request. Please try again.",
    preferredFields: ["email"],
    logMessage: "Failed to submit signup request.",
    loggerName: "tenants.signup-request",
  });

  if (Result.isSuccess(result)) return requestAccepted;

  if (result.statusCode === 409) {
    refresh();
    return ServerActionState.fromFailure("The Terms changed. Review the current version before submitting.", rawData);
  }
  if (result.statusCode === 400) refresh();
  return ServerActionState.fromFailure(result, rawData);
}
