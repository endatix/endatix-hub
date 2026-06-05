"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getStringFormValue } from "@/lib/utils/form-data-utils";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";

const resendVerificationSchema = z.object({
  userId: createEndatixIdSchema("userId"),
  email: z.email({ error: "Enter a valid email address" }).trim(),
});

export type ResendVerificationActionState = ServerActionState<{
  userId?: string;
  email?: string;
}>;

type ResendVerificationPayload =
  | FormData
  | {
      userId?: string;
      email?: string;
    };

export async function resendTenantUserVerificationAction(
  _prevState: ResendVerificationActionState,
  payload: ResendVerificationPayload,
): Promise<ResendVerificationActionState> {
  const rawData = getResendVerificationData(payload);
  const validatedData = resendVerificationSchema.safeParse(rawData);

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.InviteUsers);

    const api = new EndatixApi(session?.accessToken);
    const result = await api.users.resendVerification(
      validatedData.data.userId,
    );

    if (ApiResult.isSuccess(result)) {
      revalidatePath("/settings/organization/users");
      return { isSuccess: true, message: "Invitation email sent." };
    }

    return stateFromApiError(result, rawData);
  } catch (error) {
    return stateFromUnexpectedError(
      error,
      rawData,
      "resendTenantUserVerificationAction",
    );
  }
}

function getResendVerificationData(payload: ResendVerificationPayload): {
  userId?: string;
  email?: string;
} {
  if (payload instanceof FormData) {
    return {
      userId: getStringFormValue(payload, "userId"),
      email: getStringFormValue(payload, "email"),
    };
  }

  return {
    userId: payload.userId,
    email: payload.email ?? "",
  };
}
