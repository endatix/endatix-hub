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

const cancelInviteSchema = z.object({
  userId: createEndatixIdSchema("userId"),
});

export type CancelInviteActionState = ServerActionState<{
  userId?: string;
}>;

type CancelInvitePayload =
  | FormData
  | {
      userId?: number | string;
    };

export async function cancelTenantUserInviteAction(
  _prevState: CancelInviteActionState,
  payload: CancelInvitePayload,
): Promise<CancelInviteActionState> {
  const rawData = getCancelInviteData(payload);
  const validatedData = cancelInviteSchema.safeParse(rawData);
  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.InviteUsers);

    const api = new EndatixApi(session?.accessToken);
    const result = await api.users.cancelInvite(validatedData.data.userId);

    if (ApiResult.isSuccess(result)) {
      revalidatePath("/settings/organization/users");
      return { isSuccess: true, message: "Invite cancelled." };
    }

    return stateFromApiError(result, rawData);
  } catch (error) {
    return stateFromUnexpectedError(
      error,
      rawData,
      "cancelTenantUserInviteAction",
    );
  }
}

function getCancelInviteData(payload: CancelInvitePayload): {
  userId?: string;
} {
  if (payload instanceof FormData) {
    return { userId: getStringFormValue(payload, "userId") };
  }

  return {
    userId:
      payload.userId === undefined || payload.userId === null
        ? undefined
        : String(payload.userId),
  };
}
