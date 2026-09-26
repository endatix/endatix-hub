"use server";

import { z } from "zod";
import { EndatixApi } from "@/lib/endatix-api";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { getStringFormValue } from "@/lib/utils/form-data-utils";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

const GENERIC_SUCCESS_MESSAGE =
  "If your request is accepted, we will contact you at the email address provided.";

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
    return { isSuccess: true, message: GENERIC_SUCCESS_MESSAGE };
  }

  const rawData: SignupRequestData = {
    email: getStringFormValue(formData, "email"),
    companyName: getStringFormValue(formData, "companyName"),
  };

  const validated = signupRequestSchema.safeParse(rawData);
  if (!validated.success) {
    return ServerActionState.fromZodError(validated.error, rawData);
  }

  const api = new EndatixApi();
  const result = toResult(await api.signupRequests.create(validated.data), {
    fallbackMessage: "We could not submit your request. Please try again.",
    preferredFields: ["email"],
    logMessage: "Failed to submit signup request.",
    loggerName: "tenants.signup-request",
  });

  if (Result.isSuccess(result)) {
    return {
      isSuccess: true,
      message: result.value.message || GENERIC_SUCCESS_MESSAGE,
    };
  }

  return ServerActionState.fromFailure(result, rawData);
}
