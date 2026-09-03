"use server";

import type { AssumeTenantResponse } from "@/lib/endatix-api/auth/types";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  requireTenantManagement,
  TENANTS_LOGGER_NAME,
} from "../tenant-management.server";
import { replaceSessionTokens } from "./replace-session-tokens";

async function swapSessionAndRedirect(
  tokens: AssumeTenantResponse,
  href: Route,
): Promise<ResultType<boolean>> {
  const swapped = await replaceSessionTokens(
    tokens.accessToken,
    tokens.refreshToken,
  );
  if (Result.isError(swapped)) {
    return swapped;
  }

  redirect(href);
}

export async function assumeTenantAction(
  tenantId: string,
): Promise<ResultType<boolean>> {
  const idResult = validateEndatixId(tenantId, "tenantId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const api = await requireTenantManagement();
  if (Result.isError(api)) {
    return api;
  }

  const result = toResult(
    await api.value.auth.assumeTenant({ tenantId: idResult.value }),
    {
      fallbackMessage: "Failed to enter tenant.",
      logMessage: "Failed to enter tenant.",
      loggerName: TENANTS_LOGGER_NAME,
    },
  );
  if (Result.isError(result)) {
    return result;
  }

  return swapSessionAndRedirect(result.value, "/forms");
}

export async function exitAssumeAction(): Promise<ResultType<boolean>> {
  const api = await requireTenantManagement();
  if (Result.isError(api)) {
    return api;
  }

  const result = toResult(await api.value.auth.exitAssume(), {
    fallbackMessage: "Failed to exit tenant.",
    logMessage: "Failed to exit tenant.",
    loggerName: TENANTS_LOGGER_NAME,
  });
  if (Result.isError(result)) {
    return result;
  }

  return swapSessionAndRedirect(result.value, "/admin/tenants");
}
