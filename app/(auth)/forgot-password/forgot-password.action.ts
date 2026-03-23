"use server";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { ForgotPasswordRequestSchema } from "@/lib/endatix-api/account/types";
import { parseZodError } from "@/lib/utils/zod-error-utils";

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
    const parsedErrors = parseZodError(validatedFields.error);

    return {
      isSuccess: false,
      formErrors: parsedErrors.formErrors,
      errors: parsedErrors.fields,
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
