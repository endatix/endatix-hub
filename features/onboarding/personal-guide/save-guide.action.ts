"use server";

import { Result } from "@/lib/result";
import { auth } from "@/auth";
import { guideApi, guidePath, guideVisibility } from "./guide-api.server";

export async function saveGuide(scope: string, isDismissed: boolean): Promise<Result<boolean>> {
  const member = await guideApi(await auth());
  if (!member || member.scope !== scope || typeof isDismissed !== "boolean") {
    return Result.error("Your guide is unavailable. Refresh to try again.");
  }
  return guideVisibility(await member.api.put(guidePath, { isDismissed }));
}
