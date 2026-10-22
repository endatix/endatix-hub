"use server";

import { Permissions } from "@/features/auth/authorization";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

/** The designer reads the variables again when its Preview tab opens. */
export async function getAudienceVariablesAction(
  formId: string,
): Promise<Result<AudienceVariables>> {
  return withHubAudienceApi((api) => api.audience.getVariables(formId), {
    permission: Permissions.Forms.Edit,
    fallbackMessage: "Failed to load the form's Audience variables.",
    logMessage: "Failed to refresh Audience variables for the designer.",
    loggerName: "audience.variables.refresh",
  });
}
