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

const deleteUserSchema = z.object({
  userId: createEndatixIdSchema("userId"),
  confirmationEmail: z
    .email({ error: "Type the user's email address to confirm" })
    .trim(),
});

type DeleteUserActionData = {
  userId?: string;
  confirmationEmail?: string;
};

export type DeleteUserActionState = ServerActionState<DeleteUserActionData>;

type DeleteUserPayload =
  | FormData
  | {
      userId?: string;
      confirmationEmail?: string;
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
    if (session?.user?.id === validatedData.data.userId) {
      return deletionSafeguardError(
        rawData,
        "You cannot remove your own organization access.",
      );
    }

    const confirmationGuard = await validateDeleteConfirmation(
      api,
      validatedData.data.userId,
      validatedData.data.confirmationEmail,
      rawData,
    );
    if (!confirmationGuard.isSuccess) {
      return confirmationGuard;
    }

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

function getDeleteUserData(payload: DeleteUserPayload): DeleteUserActionData {
  if (payload instanceof FormData) {
    return {
      userId: getStringFormValue(payload, "userId"),
      confirmationEmail: getStringFormValue(payload, "confirmationEmail"),
    };
  }

  return {
    userId: payload.userId,
    confirmationEmail: payload.confirmationEmail,
  };
}

async function validateDeleteConfirmation(
  api: EndatixApi,
  userId: string,
  confirmationEmail: string,
  rawData: DeleteUserActionData,
): Promise<DeleteUserActionState> {
  const userResult = await api.users.getById(userId);
  if (ApiResult.isError(userResult)) {
    return stateFromApiError(userResult, rawData);
  }

  const email = userResult.data.email;
  if (
    email !== null &&
    email.localeCompare(confirmationEmail, undefined, {
      sensitivity: "accent",
    }) === 0
  ) {
    return { isSuccess: true };
  }

  return deletionSafeguardError(
    rawData,
    "Type the user's email address to confirm.",
  );
}

function deletionSafeguardError(
  data: DeleteUserActionData,
  message: string,
): DeleteUserActionState {
  return {
    isSuccess: false,
    formErrors: [message],
    data,
  };
}

