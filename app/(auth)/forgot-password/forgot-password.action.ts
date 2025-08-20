"use server";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { ForgotPasswordRequestSchema } from "@/lib/endatix-api/account/types";

interface ForgotPasswordActionState {
  isSuccess: boolean;
  formErrors?: string[];
  errors?: {
    email?: string[];
  };
  values?: {
    email?: string;
  };
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState | null,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const rawData = {
    email: formData.get("email") as string,
  };

  const validatedFields = ForgotPasswordRequestSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten();
    return {
      isSuccess: false,
      formErrors: errors?.formErrors,
      errors: errors?.fieldErrors,
      values: rawData,
    };
  }

  const endatix = new EndatixApi();
  const result = await endatix.account.forgotPassword(validatedFields.data);
  if (ApiResult.isSuccess(result)) {
    return {
      isSuccess: true,
    };
  }

  return {
    isSuccess: false,
    formErrors: [result.error.message],
    values: rawData,
  };
}
