"use server";

import { revalidatePath } from "next/cache";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { requirePlatformAdmin } from "../server";

const LOGGER_NAME = "platform-admin.admins";

export type RevokePlatformAdminResult = Result<string>;

export async function revokePlatformAdminAction(
  userId: string,
): Promise<RevokePlatformAdminResult> {
  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.platformAdmins.revoke(userId);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to revoke platform administrator access.",
    logMessage: "Failed to revoke platform administrator access.",
    loggerName: LOGGER_NAME,
    mapData: (data) => data.message,
  });

  if (Result.isSuccess(result)) {
    invalidateUserAuthorizationCache({ allUsers: true });
    revalidatePath("/admin/platform-admins");
  }

  return result;
}
