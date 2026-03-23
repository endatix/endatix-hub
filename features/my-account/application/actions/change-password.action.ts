"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  EndatixApi,
  ChangePasswordRequestSchema,
  ApiResult,
} from "@/lib/endatix-api";
import { parseZodError } from "@/lib/utils/zod-error-utils";

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
): Promise<ChangePasswordState | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const rawData = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedData = ChangePasswordRequestSchema.safeParse(rawData);

  if (!validatedData.success) {
    const parsedErrors = parseZodError(validatedData.error);
    return {
      isSuccess: false,
      formErrors: parsedErrors.formErrors,
      errors: parsedErrors.fields,
      values: rawData,
    };
  }

  const endatix = new EndatixApi(session?.accessToken);
  const result = await endatix.myAccount.changePassword(validatedData.data);

  if (ApiResult.isSuccess(result)) {
    return {
      isSuccess: true,
    };
  }

  return {
    isSuccess: false,
    formErrors: [result.error.message],
    errors: undefined,
    values: rawData,
  };
}
