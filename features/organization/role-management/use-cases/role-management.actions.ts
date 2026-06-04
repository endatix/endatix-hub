"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi, type ApiError } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import {
  type DeepFieldErrors,
  ServerActionState,
} from "@/lib/utils/zod-error-utils";
import {
  getStringFormValue,
  getStringFormValues,
} from "@/lib/utils/form-data-utils";

const roleSchema = z.object({
  name: z.string().trim().min(1).max(256),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(z.string().trim().min(1)).default([]),
});

const deleteRoleSchema = z.object({
  roleName: z.string().trim().min(1),
});

const updateRoleSchema = z.object({
  roleName: z.string().trim().min(1),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(z.string().trim().min(1)).default([]),
});

const ROLE_ACTION_LOGGER_NAME = "organization.role-management";

type RoleActionData = {
  name?: string;
  roleName?: string;
  description?: string;
  permissions?: string[];
};

export type RoleActionState = ServerActionState<RoleActionData>;

export async function createRoleAction(
  _prevState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageRoles);

  const rawData = {
    name: getStringFormValue(formData, "name"),
    description: getStringFormValue(formData, "description"),
    permissions: getStringFormValues(formData, "permissions"),
  };

  const validatedData = roleSchema.safeParse(rawData);
  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  const api = new EndatixApi(session?.accessToken);
  const result = await api.roles.create(validatedData.data);

  if (ApiResult.isSuccess(result)) {
    revalidatePath("/settings/organization/roles");
    return { isSuccess: true, message: "Role created." };
  }

  return stateFromRoleApiError(result, rawData, "Failed to create role", [
    "name",
    "description",
    "permissions",
  ]);
}

export async function deleteRoleAction(
  _prevState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageRoles);

  const rawData = { roleName: getStringFormValue(formData, "roleName") };
  const validatedData = deleteRoleSchema.safeParse(rawData);
  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  const api = new EndatixApi(session?.accessToken);
  const result = await api.roles.delete(validatedData.data.roleName);

  if (ApiResult.isSuccess(result)) {
    revalidatePath("/settings/organization/roles");
    return { isSuccess: true, message: "Role deleted." };
  }

  return stateFromRoleApiError(result, rawData, "Failed to delete role", [
    "roleName",
  ]);
}

export async function updateRoleAction(
  _prevState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.ManageRoles);

  const rawData = {
    roleName: getStringFormValue(formData, "roleName"),
    description: getStringFormValue(formData, "description"),
    permissions: getStringFormValues(formData, "permissions"),
  };

  const validatedData = updateRoleSchema.safeParse(rawData);
  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  const api = new EndatixApi(session?.accessToken);
  const result = await api.roles.update(validatedData.data.roleName, {
    description: validatedData.data.description,
    permissions: validatedData.data.permissions,
  });

  if (ApiResult.isSuccess(result)) {
    revalidatePath("/settings/organization/roles");
    return { isSuccess: true, message: "Role updated." };
  }

  return stateFromRoleApiError(result, rawData, "Failed to update role", [
    "roleName",
    "description",
    "permissions",
  ]);
}

function stateFromRoleApiError(
  result: ApiError,
  data: RoleActionData,
  logMessage: string,
  preferredFields: string[],
): RoleActionState {
  const mappedResult = toResult(result, {
    fallbackMessage: logMessage,
    preferredFields,
    logMessage,
    loggerName: ROLE_ACTION_LOGGER_NAME,
  });

  return {
    isSuccess: false,
    formErrors: Result.isError(mappedResult)
      ? [mappedResult.message]
      : undefined,
    errors: result.error.fields as DeepFieldErrors<RoleActionData> | undefined,
    data,
  };
}

