"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";

const createTenantUserSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }).trim(),
  roles: z.array(z.string().trim().min(1)).default([]),
});

export type CreateTenantUserActionState = ServerActionState<{
  email?: string;
  roles?: string[];
}>;

type CreateTenantUserPayload =
  | FormData
  | {
      email?: string;
      roles?: string[];
    };

export async function createTenantUserAction(
  _prevState: CreateTenantUserActionState,
  payload: CreateTenantUserPayload,
): Promise<CreateTenantUserActionState> {
  const rawData = getCreateTenantUserData(payload);
  const validatedData = createTenantUserSchema.safeParse(rawData);
  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  if (validatedData.data.roles.some(isPlatformScopedRole)) {
    return {
      isSuccess: false,
      formErrors: [
        "Platform administrator roles are managed at the platform level.",
      ],
      data: rawData,
    };
  }

  if (validatedData.data.roles.some(isTenantAdminRole)) {
    return {
      isSuccess: false,
      formErrors: [
        "Admin access can be assigned after the invited user verifies their account.",
      ],
      data: rawData,
    };
  }

  try {
    const session = await auth();
    const { requirePermission } = await authorization(session);
    await requirePermission(Permissions.Tenant.InviteUsers);

    const api = new EndatixApi(session?.accessToken);
    const result = await api.users.create(validatedData.data);

    if (ApiResult.isSuccess(result)) {
      revalidatePath("/settings/organization/users");
      return { isSuccess: true, message: "Invite sent." };
    }

    return stateFromApiError(result, rawData);
  } catch (error) {
    return stateFromUnexpectedError(error, rawData, "createTenantUserAction");
  }
}

function isPlatformScopedRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.PlatformAdmin.toLowerCase();
}

function isTenantAdminRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.Admin.toLowerCase();
}

function getCreateTenantUserData(payload: CreateTenantUserPayload): {
  email?: string;
  roles?: string[];
} {
  if (payload instanceof FormData) {
    return {
      email: String(payload.get("email") ?? ""),
      roles: payload.getAll("roles").map(String),
    };
  }

  return {
    email: payload.email ?? "",
    roles: payload.roles ?? [],
  };
}
