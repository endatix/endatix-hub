"use server";

import { Result } from "@/lib/result";
import { auth } from "@/auth";
import { refresh } from "next/cache";
import { guideApi, guidePath, guideVisibility } from "./guide-api.server";

export async function saveGuide(scope: string, isDismissed: boolean): Promise<Result<boolean>> {
  const member = await guideApi(await auth());
  if (!member || member.scope !== scope || typeof isDismissed !== "boolean") {
    return Result.error("Your guide is unavailable. Refresh to try again.");
  }
  const result = guideVisibility(await member.api.put(guidePath, { isDismissed }));
  if (Result.isSuccess(result)) refresh();
  return result;
}
