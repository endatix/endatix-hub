"use server";

import { EndatixApi } from "@/lib/endatix-api";
import type { CreatePlatformTenantRequest } from "@/lib/endatix-api/platform-tenants/types";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "../require-platform-admin/require-platform-admin.server";
import { identityStepError } from "./tenant-self-registration";

export async function createTenantAction(request: CreatePlatformTenantRequest) {
  const session = await requirePlatformAdmin();
  const identityError = identityStepError(request.name, request.slug);
  if (identityError) {
    return Result.validationError(identityError);
  }

  const api = new EndatixApi(session.accessToken);
  const created = await api.platformTenants.create({
    name: request.name.trim(),
    slug: request.slug.trim(),
    description: request.description?.trim() || null,
    allowSelfRegistration: request.allowSelfRegistration,
    allowedAuthProviderKeys: request.allowedAuthProviderKeys,
    defaultRegistrationRoleName: request.defaultRegistrationRoleName,
  });

  if (!created.success) {
    return mapApiErrorToResult(created, {
      fallbackMessage: "Failed to create tenant",
      preferredFields: ["slug", "name", "defaultRegistrationRoleName"],
    });
  }

  revalidatePath("/admin/tenants");
  return Result.success(created.data);
}
