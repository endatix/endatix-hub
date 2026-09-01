"use server";

import { requirePlatformAdmin } from "@/features/platform-admin/require-platform-admin/require-platform-admin.server";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { redirect } from "next/navigation";
import { replaceSessionTokens } from "./replace-session-tokens";

export async function assumeTenantAction(tenantId: string) {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const assumed = await api.auth.assumeTenant({ tenantId });

  if (!assumed.success) {
    return mapApiErrorToResult(assumed, {
      fallbackMessage: "Failed to enter tenant",
    });
  }

  const swapped = await replaceSessionTokens(
    assumed.data.accessToken,
    assumed.data.refreshToken,
  );
  if (Result.isError(swapped)) {
    return swapped;
  }

  redirect("/");
}

export async function exitAssumeAction() {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const exited = await api.auth.exitAssume();

  if (!exited.success) {
    return mapApiErrorToResult(exited, {
      fallbackMessage: "Failed to exit tenant",
    });
  }

  const swapped = await replaceSessionTokens(
    exited.data.accessToken,
    exited.data.refreshToken,
  );
  if (Result.isError(swapped)) {
    return swapped;
  }

  redirect("/admin/tenants");
}
