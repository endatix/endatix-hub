"use server";

import type {
  PlatformTenant,
  UpdatePlatformTenantRequest,
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

export async function getTenantAction(
  tenantId: string,
): Promise<ResultType<PlatformTenant>> {
  const api = await requireTenantManagement();
  if (Result.isError(api)) {
    return api;
  }

  return toResult(await api.value.platformTenants.getById(tenantId), {
    fallbackMessage: "Failed to load tenant.",
    logMessage: "Failed to load tenant.",
    loggerName: TENANTS_LOGGER_NAME,
  });
}

export async function updateTenantAction(
  tenantId: string,
  request: UpdatePlatformTenantRequest,
): Promise<ResultType<PlatformTenant>> {
  const api = await requireTenantManagement();
  if (Result.isError(api)) {
    return api;
  }

  const nameError =
    request.name === undefined ? null : tenantNameError(request.name);
  if (nameError) {
    return Result.validationError<PlatformTenant>(nameError);
  }

  const result = toResult(
    await api.value.platformTenants.update(tenantId, request),
    {
      fallbackMessage: "Failed to update tenant.",
      logMessage: "Failed to update tenant.",
      loggerName: TENANTS_LOGGER_NAME,
      preferredFields: ["name", "defaultRegistrationRoleName"],
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(TENANTS_LIST_PATH);
  }

  return result;
}
