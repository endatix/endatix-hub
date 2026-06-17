"use server";

import { revalidatePath } from "next/cache";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { requirePlatformAdmin } from "../server";

export async function revokePlatformAdminAction(formData: FormData) {
  const session = await requirePlatformAdmin();
  const userId = String(formData.get("userId") ?? "");
  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.platformAdmins.revoke(userId);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to revoke platform administrator access.",
    logMessage: "Failed to revoke platform administrator access.",
    loggerName: "platform-admin.admins",
  });

  if (Result.isSuccess(result)) {
    revalidatePath("/admin/platform-admins");
  }
}
