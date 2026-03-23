"use server";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { ForgotPasswordRequestSchema } from "@/lib/endatix-api/account/types";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

export type ForgotPasswordActionState = ServerActionState<{ email?: string }>;

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const rawData = {
    email: formData.get("email") as string,
  };

  const validatedFields = ForgotPasswordRequestSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return ServerActionState.fromZodError(validatedFields.error, rawData) as ForgotPasswordActionState;
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
    data: rawData,
  };
}
