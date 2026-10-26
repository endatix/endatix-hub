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
    // Runs unasked on every Preview open: a redirect would throw away the author's unsaved edits.
    background: true,
    fallbackMessage: "Failed to load the form's participant properties.",
    logMessage: "Failed to refresh Audience variables for the designer.",
    loggerName: "audience.variables.refresh",
  });
}
