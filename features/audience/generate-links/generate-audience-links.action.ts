"use server";

import type { IssuedAudienceLink } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export async function generateAudienceLinksAction(
  formId: string,
): Promise<Result<IssuedAudienceLink[]>> {
  return withHubAudienceApi((api) => api.audience.generateLinks(formId), {
    formId,
    fallbackMessage: "Failed to create personalised links.",
    logMessage: "Failed to create personalised links.",
    loggerName: "audience.links",
  });
}
