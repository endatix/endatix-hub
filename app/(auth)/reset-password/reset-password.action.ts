"use server";

import { EndatixApi } from "@/lib/endatix-api";
import { ApiResult, ResetPasswordRequestSchema } from "@/lib/endatix-api/types";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

export type ResetPasswordActionState = ServerActionState<{
  email?: string;
  resetCode?: string;
  newPassword?: string;
  confirmPassword?: string;
}> & {
  errorCode?: string;
};

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

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
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
    data: rawData,
  };
}
