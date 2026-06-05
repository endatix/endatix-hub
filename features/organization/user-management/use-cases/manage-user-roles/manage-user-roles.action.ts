"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  getStringFormValue,
  getStringFormValues,
} from "@/lib/utils/form-data-utils";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";
import { getUnassignableRoleError } from "../role-assignment-rules";

const userRoleSchema = z.object({
  userId: createEndatixIdSchema("userId"),
  roles: z.array(z.string().trim().min(1)).default([]),
});

export type UserRoleActionState = ServerActionState<{
  userId?: string;
  roles?: string[];
}>;

type UserRolePayload =
  | FormData
  | {
      userId?: string;
      roles?: string[];
    };

export async function setUserRoleAction(
  _prevState: UserRoleActionState,
  payload: UserRolePayload,
): Promise<UserRoleActionState> {
  return replaceUserRoles(payload);
}

async function replaceUserRoles(
  payload: UserRolePayload,
): Promise<UserRoleActionState> {
  const rawData = getUserRoleData(payload);
  const validatedData = userRoleSchema.safeParse(rawData);

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.ManageRoles);

    const api = new EndatixApi(session?.accessToken);
    return handleSetMutation(api, validatedData.data, rawData);
  } catch (error) {
    return stateFromUnexpectedError(error, rawData, "setUserRoleAction");
  }
}

async function handleSetMutation(
  api: EndatixApi,
  data: z.infer<typeof userRoleSchema>,
  rawData: Record<string, unknown>,
): Promise<UserRoleActionState> {
  const selectedRoles = data.roles;
  const unassignableRoleError = getUnassignableRoleError(selectedRoles, {
    allowTenantAdmin: true,
  });
  if (unassignableRoleError) {
    return {
      isSuccess: false,
      formErrors: [unassignableRoleError],
      data: rawData,
    };
  }

  const result = await api.users.replaceRoles(data.userId, {
    roleNames: selectedRoles,
  });
  if (ApiResult.isError(result)) {
    return stateFromApiError(result, rawData);
  }

  revalidatePath("/settings/organization/users");
  return { isSuccess: true };
}

function getUserRoleData(payload: UserRolePayload) {
  if (payload instanceof FormData) {
    return {
      userId: getStringFormValue(payload, "userId"),
      roles: getStringFormValues(payload, "roles"),
    };
  }

  return {
    userId: payload.userId,
    roles: payload.roles ?? [],
  };
}
