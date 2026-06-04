"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

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

export type RoleActionState = ServerActionState<{
  name?: string;
  roleName?: string;
  description?: string;
  permissions?: string[];
}>;

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

  return {
    isSuccess: false,
    formErrors: [result.error.message],
    data: rawData,
  };
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

  return {
    isSuccess: false,
    formErrors: [result.error.message],
    data: rawData,
  };
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

  return {
    isSuccess: false,
    formErrors: [result.error.message],
    data: rawData,
  };
}

function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringFormValues(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}
