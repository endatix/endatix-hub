"use server";

import type {
  CreatePlatformTenantRequest,
  PlatformTenant,
} from "@/lib/endatix-api/platform-tenants/types";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";
import {
  TENANTS_LIST_PATH,
  TENANTS_LOGGER_NAME,
} from "../tenant-management.constants";
import { requireTenantManagement } from "../tenant-management.server";
import { tenantNameError } from "../tenant-registration";

export async function createTenantAction(
  request: CreatePlatformTenantRequest,
): Promise<ResultType<PlatformTenant>> {
  const api = await requireTenantManagement();
  if (Result.isError(api)) {
    return api;
  }

  const nameError = tenantNameError(request.name);
  if (nameError) {
    return Result.validationError<PlatformTenant>(nameError);
  }

  const result = toResult(
    await api.value.platformTenants.create({
      name: request.name.trim(),
      description: request.description?.trim() || null,
      allowSelfRegistration: request.allowSelfRegistration,
      defaultRegistrationRoleName: request.defaultRegistrationRoleName,
    }),
    {
      fallbackMessage: "Failed to create tenant.",
      logMessage: "Failed to create tenant.",
      loggerName: TENANTS_LOGGER_NAME,
      preferredFields: ["name", "defaultRegistrationRoleName"],
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(TENANTS_LIST_PATH);
  }

  return result;
}
