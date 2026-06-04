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

const deleteUserSchema = z.object({
  userId: createEndatixIdSchema("userId"),
});

export type DeleteUserActionState = ServerActionState<{
  userId?: string;
}>;

type DeleteUserPayload =
  | FormData
  | {
      userId?: number | string;
    };

export async function deleteUserAction(
  _prevState: DeleteUserActionState,
  payload: DeleteUserPayload,
): Promise<DeleteUserActionState> {
  const rawData = getDeleteUserData(payload);
  const validatedData = deleteUserSchema.safeParse(rawData);

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.ManageUsers);

    const api = new EndatixApi(session?.accessToken);
    const result = await api.users.removeAccess(validatedData.data.userId);

    if (ApiResult.isSuccess(result)) {
      revalidatePath("/settings/organization/users");
      return { isSuccess: true, message: "User access removed." };
    }

    return stateFromApiError(result, rawData);
  } catch (error) {
    return stateFromUnexpectedError(error, rawData, "deleteUserAction");
  }
}

function getDeleteUserData(payload: DeleteUserPayload): { userId?: string } {
  if (payload instanceof FormData) {
    return { userId: String(payload.get("userId") ?? "") };
  }

  return {
    userId:
      payload.userId === undefined || payload.userId === null
        ? undefined
        : String(payload.userId),
  };
}
