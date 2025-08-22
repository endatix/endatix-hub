"use server";

import { EndatixApi } from "@/lib/endatix-api";
import { ApiResult, ResetPasswordRequestSchema } from "@/lib/endatix-api/types";

export interface ResetPasswordActionState {
  isSuccess?: boolean;
  formErrors?: string[];
  errorCode?: string;
  errors?: {
    email?: string[];
    resetCode?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  };
  values?: {
    email?: string;
    resetCode?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
}

export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const rawData = {
    email: formData.get("email") as string,
    resetCode: formData.get("resetCode") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedData = ResetPasswordRequestSchema.safeParse(rawData);

  const errors = validatedData.error?.flatten();
  if (!validatedData.success) {
    return {
      isSuccess: false,
      formErrors: errors?.formErrors,
      errors: errors?.fieldErrors,
      values: rawData,
    };
  }

  const endatix = new EndatixApi();
  const resetPasswordResult = await endatix.account.resetPassword(
    validatedData.data,
  );

  if (ApiResult.isSuccess(resetPasswordResult)) {
    return {
      isSuccess: true,
    };
  }

  return {
    isSuccess: false,
    errorCode: resetPasswordResult.error.errorCode,
    formErrors: [resetPasswordResult.error.message],
    values: rawData,
  };
}
