"use server";

import { EndatixApi, type ApiError } from "@/lib/endatix-api";
import {
  ActivateInviteRequestSchema,
  ApiResult,
} from "@/lib/endatix-api/types";
import {
  type DeepFieldErrors,
  ServerActionState,
} from "@/lib/utils/zod-error-utils";

type ActivateInviteData = {
  token?: string;
  password?: string;
  confirmPassword?: string;
};

export type ActivateInviteActionState =
  ServerActionState<ActivateInviteData> & {
    email?: string;
    errorCode?: string;
  };

export async function activateInviteAction(
  _prevState: ActivateInviteActionState,
  formData: FormData,
): Promise<ActivateInviteActionState> {
  const rawData = {
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const safeData = { token: rawData.token };

  const validatedData = ActivateInviteRequestSchema.safeParse(rawData);

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, safeData);
  }

  try {
    const endatix = new EndatixApi();
    const result = await endatix.auth.activateInvite(validatedData.data);

    if (ApiResult.isSuccess(result)) {
      return {
        isSuccess: true,
        email: result.data.email,
        message: result.data.message,
      };
    }

    return stateFromApiError(result, safeData);
  } catch (error) {
    console.error("Unexpected error in activateInviteAction:", error);
    return {
      isSuccess: false,
      formErrors: ["Something went wrong. Please try again."],
      data: safeData,
    };
  }
}

function stateFromApiError(
  result: ApiError,
  data: ActivateInviteData,
): ActivateInviteActionState {
  return {
    isSuccess: false,
    errorCode: result.error.errorCode,
    formErrors: [result.error.message],
    errors: result.error.fields as
      | DeepFieldErrors<ActivateInviteData>
      | undefined,
    data,
  };
}
