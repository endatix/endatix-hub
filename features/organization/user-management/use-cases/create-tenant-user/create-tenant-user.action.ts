"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  getStringFormValue,
  getStringFormValues,
} from "@/lib/utils/form-data-utils";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  stateFromApiError,
  stateFromUnexpectedError,
} from "../server-action-state";
import { getUnassignableRoleError } from "../role-assignment-rules";

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

  const unassignableRoleError = getUnassignableRoleError(
    validatedData.data.roles,
  );
  if (unassignableRoleError) {
    return {
      isSuccess: false,
      formErrors: [unassignableRoleError],
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

function getCreateTenantUserData(payload: CreateTenantUserPayload): {
  email?: string;
  roles?: string[];
} {
  if (payload instanceof FormData) {
    return {
      email: getStringFormValue(payload, "email"),
      roles: getStringFormValues(payload, "roles"),
    };
  }

  return {
    email: payload.email ?? "",
    roles: payload.roles ?? [],
  };
}
