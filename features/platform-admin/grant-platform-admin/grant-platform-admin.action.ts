"use server";

import { revalidatePath } from "next/cache";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { requirePlatformAdmin } from "../server";

const LOGGER_NAME = "platform-admin.admins";

export type GrantPlatformAdminResult = Result<string>;

export async function grantPlatformAdminAction(
  userId: string,
): Promise<GrantPlatformAdminResult> {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.platformAdmins.grant(userId);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to grant platform administrator access.",
    logMessage: "Failed to grant platform administrator access.",
    loggerName: LOGGER_NAME,
    mapData: (data) => data.message,
  });

  if (Result.isSuccess(result)) {
    revalidatePath("/admin/platform-admins");
  }

  return result;
}
