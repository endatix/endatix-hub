"use server";

import { auth } from "@/auth";
import { EndatixApi, isNotFoundError, type MembershipTenant } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { redirect } from "next/navigation";
import { replaceSessionTokens } from "@/features/platform-admin/assume-tenant/replace-session-tokens";

export async function listMyTenantsAction(): Promise<
  Result<MembershipTenant[]>
> {
  const session = await auth();
  if (!session?.accessToken) {
    return Result.success([]);
  }

  const api = new EndatixApi(session.accessToken);
  const listed = await api.auth.listMyTenants();
  if (!listed.success) {
    if (isNotFoundError(listed)) {
      return Result.success([]);
    }

    return mapApiErrorToResult(listed, {
      fallbackMessage: "Failed to load tenants",
    });
  }

  return Result.success(listed.data.items);
}

export async function switchTenantAction(tenantId: string) {
  const session = await auth();
  if (!session?.accessToken) {
    return Result.error("You must be signed in to switch tenants.");
  }

  const api = new EndatixApi(session.accessToken);
  const switched = await api.auth.switchTenant({ tenantId });
  if (!switched.success) {
    return mapApiErrorToResult(switched, {
      fallbackMessage: "Failed to switch tenant",
    });
  }

  const swapped = await replaceSessionTokens(
    switched.data.accessToken,
    switched.data.refreshToken,
  );
  if (Result.isError(swapped)) {
    return swapped;
  }

  redirect("/");
}
