"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import {
  getStringFormValue,
  getStringFormValues,
} from "@/lib/utils/form-data-utils";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { stateFromUnexpectedError } from "../server-action-state";
import { getUnassignableRoleError } from "../role-assignment-rules";
import { inviteFailure, type inviteFeedback } from "./invite-feedback";
import { canResumeWorkspaceSetup } from "@/features/onboarding/server";

const createTenantUserSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }).trim(),
  roles: z.array(z.string().trim().min(1)).default([]),
});

export type CreateTenantUserActionState = ServerActionState<{
  email?: string;
  roles?: string[];
}> & { feedback?: Awaited<ReturnType<typeof inviteFeedback>> };

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

  let response;
  try {
    response = await sendAuthorizedInvite(validatedData.data);
    if (response.success) revalidatePath("/settings/organization/users");
  } catch (error) {
    return stateFromUnexpectedError(error, rawData, "createTenantUserAction");
  }
  const failure = await inviteFailure(response, canResumeWorkspaceSetup);
  if (failure) return { ...failure, data: rawData };
  return { isSuccess: true, message: "Invite sent." };
}

async function sendAuthorizedInvite(payload: z.infer<typeof createTenantUserSchema>) {
  const session = await auth();
  const { requirePermission } = await authorization(session);
  await requirePermission(Permissions.Tenant.InviteUsers);
  const api = new EndatixApi(session?.accessToken);
  return api.users.create(payload);
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
