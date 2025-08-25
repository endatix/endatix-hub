"use server";

import { getSession } from "@/features/auth";
import {
  EndatixApi,
  ChangePasswordRequestSchema,
  ApiResult,
} from "@/lib/endatix-api";

export interface ChangePasswordState {
  isSuccess?: boolean;
  formErrors?: string[];
  errors?: {
    currentPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  };
  values?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const rawData = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedData = ChangePasswordRequestSchema.safeParse(rawData);
  const errors = validatedData.error?.flatten();

  if (!validatedData.success) {
    return {
      isSuccess: false,
      formErrors: errors?.formErrors,
      errors: errors?.fieldErrors,
      values: rawData,
    };
  }

  const session = await getSession();
  const endatix = new EndatixApi(session);
  const result = await endatix.myAccount.changePassword(validatedData.data);

  if (ApiResult.isSuccess(result)) {
    return {
      isSuccess: true,
    };
  }

  return {
    isSuccess: false,
    formErrors: [result.error.message],
    errors: errors?.fieldErrors,
    values: rawData,
  };
}
