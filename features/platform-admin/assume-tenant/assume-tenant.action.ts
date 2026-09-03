"use server";

import { auth } from "@/auth";
import type { AssumeTenantResponse } from "@/lib/endatix-api/auth/types";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TENANTS_LOGGER_NAME } from "../tenant-management.constants";
import { requireTenantManagement } from "../tenant-management.server";
import { readAssumeSession } from "./read-assume-session";
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

  revalidatePath("/", "layout");
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
  const session = await auth();
  if (!session?.accessToken) {
    return Result.error("You must be signed in to exit the tenant.");
  }

  if (!readAssumeSession(session.accessToken)) {
    return Result.error("Not in an assumed tenant session.");
  }

  const result = toResult(
    await new EndatixApi(session.accessToken).auth.exitAssume(),
    {
      fallbackMessage: "Failed to exit tenant.",
      logMessage: "Failed to exit tenant.",
      loggerName: TENANTS_LOGGER_NAME,
    },
  );
  if (Result.isError(result)) {
    return result;
  }

  return swapSessionAndRedirect(result.value, "/admin/tenants");
}
