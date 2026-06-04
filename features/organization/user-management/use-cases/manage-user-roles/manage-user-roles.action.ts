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
  roleName: z.string().trim().min(1).optional(),
  roles: z.array(z.string().trim().min(1)).default([]),
  currentRoles: z.array(z.string().trim().min(1)).default([]),
});

export type UserRoleActionState = ServerActionState<{
  userId?: string;
  roleName?: string;
  roles?: string[];
  currentRoles?: string[];
}>;

type UserRolePayload =
  | FormData
  | {
      userId?: number | string;
      roleName?: string;
      roles?: string[];
      currentRoles?: string[];
    };

export async function assignUserRoleAction(
  _prevState: UserRoleActionState,
  payload: UserRolePayload,
): Promise<UserRoleActionState> {
  return mutateUserRole(payload, "assign");
}

export async function removeUserRoleAction(
  _prevState: UserRoleActionState,
  payload: UserRolePayload,
): Promise<UserRoleActionState> {
  return mutateUserRole(payload, "remove");
}

export async function setUserRoleAction(
  _prevState: UserRoleActionState,
  payload: UserRolePayload,
): Promise<UserRoleActionState> {
  return mutateUserRole(payload, "set");
}

async function mutateUserRole(
  payload: UserRolePayload,
  mutation: "assign" | "remove" | "set",
): Promise<UserRoleActionState> {
  const rawData = getUserRoleData(payload);
  const validatedData = userRoleSchema.safeParse(rawData);

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.ManageUsers);

    const api = new EndatixApi(session?.accessToken);

    if (mutation === "set") {
      return handleSetMutation(api, validatedData.data, rawData);
    }

    return handleSingleRoleMutation(api, validatedData.data, mutation, rawData);
  } catch (error) {
    return stateFromUnexpectedError(error, rawData, "setUserRoleAction");
  }
}

async function handleSingleRoleMutation(
  api: EndatixApi,
  data: z.infer<typeof userRoleSchema>,
  mutation: "assign" | "remove",
  rawData: Record<string, unknown>,
): Promise<UserRoleActionState> {
  if (!data.roleName) {
    return {
      isSuccess: false,
      formErrors: ["Role name is required."],
      data: rawData,
    };
  }

  if (isPlatformScopedRole(data.roleName)) {
    return {
      isSuccess: false,
      formErrors: [
        "Platform administrator roles are managed at the platform level.",
      ],
      data: rawData,
    };
  }

  const result =
    mutation === "remove"
      ? await api.users.removeRole(data.userId, data.roleName)
      : await api.users.assignRole(data.userId, { roleName: data.roleName });

  if (ApiResult.isSuccess(result)) {
    revalidatePath("/settings/organization/users");
    return { isSuccess: true };
  }

  return stateFromApiError(result, rawData);
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

  const currentEditableRoles = data.currentRoles.filter(
    (role) => !isPlatformScopedRole(role),
  );

  for (const currentRole of currentEditableRoles) {
    if (!selectedRoles.includes(currentRole)) {
      const removeResult = await api.users.removeRole(data.userId, currentRole);
      if (ApiResult.isError(removeResult)) {
        return stateFromApiError(removeResult, rawData);
      }
    }
  }

  for (const selectedRole of selectedRoles) {
    if (currentEditableRoles.includes(selectedRole)) {
      continue;
    }

    const assignResult = await api.users.assignRole(data.userId, {
      roleName: selectedRole,
    });

    if (ApiResult.isError(assignResult)) {
      return stateFromApiError(assignResult, rawData);
    }
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
      roleName: String(payload.get("roleName") ?? "") || undefined,
      roles: payload.getAll("roles").map(String),
      currentRoles: payload.getAll("currentRoles").map(String),
    };
  }

  return {
    userId:
      payload.userId === undefined || payload.userId === null
        ? undefined
        : String(payload.userId),
    roleName: payload.roleName?.trim() || undefined,
    roles: payload.roles ?? [],
    currentRoles: payload.currentRoles ?? [],
  };
}
