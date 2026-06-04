"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";

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
      userId?: number | string;
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
  if (selectedRoles.some(isPlatformScopedRole)) {
    return {
      isSuccess: false,
      formErrors: [
        "Platform administrator roles are managed at the platform level.",
      ],
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

function isPlatformScopedRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.PlatformAdmin.toLowerCase();
}

function getUserRoleData(payload: UserRolePayload) {
  if (payload instanceof FormData) {
    return {
      userId: String(payload.get("userId") ?? ""),
      roles: payload.getAll("roles").map(String),
    };
  }

  return {
    userId:
      payload.userId === undefined || payload.userId === null
        ? undefined
        : String(payload.userId),
    roles: payload.roles ?? [],
  };
}
