"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";

const userLockoutSchema = z.object({
  userId: createEndatixIdSchema("userId"),
});

export type UserLockoutActionState = ServerActionState<{
  userId?: string;
  message?: string;
}>;

type UserLockoutPayload =
  | FormData
  | {
      userId?: string;
    };

export async function lockoutUserAction(
  _prevState: UserLockoutActionState,
  payload: UserLockoutPayload,
): Promise<UserLockoutActionState> {
  return setUserLockout(payload, true, "lockoutUserAction");
}

export async function unlockUserAction(
  _prevState: UserLockoutActionState,
  payload: UserLockoutPayload,
): Promise<UserLockoutActionState> {
  return setUserLockout(payload, false, "unlockUserAction");
}

async function setUserLockout(
  payload: UserLockoutPayload,
  shouldLockout: boolean,
  actionName: string,
): Promise<UserLockoutActionState> {
  const rawData = getUserLockoutData(payload);
  const validatedData = userLockoutSchema.safeParse(rawData);

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.ManageUsers);

    const api = new EndatixApi(session?.accessToken);
    const result = shouldLockout
      ? await api.users.lockout(validatedData.data.userId)
      : await api.users.unlock(validatedData.data.userId);

    if (ApiResult.isError(result)) {
      return stateFromApiError(result, rawData);
    }

    revalidatePath("/settings/organization/users");
    return { isSuccess: true, message: result.data.message };
  } catch (error) {
    return stateFromUnexpectedError(error, rawData, actionName);
  }
}

function getUserLockoutData(payload: UserLockoutPayload) {
  if (payload instanceof FormData) {
    return {
      userId: payload.get("userId")?.toString(),
    };
  }

  return {
    userId: payload.userId,
  };
}
