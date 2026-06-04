"use server";

import { TelemetryLogger } from "@/features/telemetry";
import { EndatixApi, type ApiError } from "@/lib/endatix-api";
import {
  ActivateInviteRequestSchema,
  ApiResult,
} from "@/lib/endatix-api/types";
import { getStringFormValue } from "@/lib/utils/form-data-utils";
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
    token: getStringFormValue(formData, "token"),
    password: getStringFormValue(formData, "password"),
    confirmPassword: getStringFormValue(formData, "confirmPassword"),
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
    TelemetryLogger.error(
      "Unexpected error in activateInviteAction",
      undefined,
      {
        errorName: getErrorName(error),
        hasToken: Boolean(validatedData.data.token),
      },
      "auth.activate-invite",
    );
    return {
      isSuccess: false,
      formErrors: ["Something went wrong. Please try again."],
      data: safeData,
    };
  }
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
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
