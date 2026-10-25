"use server";

import { Permissions } from "@/features/auth/authorization";
import type {
  AudienceVariablePreset,
  AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

/**
 * Saves the designer's Test participant values editor. Runs inside the designer: a redirect would
 * throw away the author's unsaved edits.
 */
export async function saveTestParticipantsAction(
  formId: string,
  presets: AudienceVariablePreset[],
): Promise<Result<AudienceVariables>> {
  return withHubAudienceApi(
    (api) => api.audience.saveTestParticipants(formId, presets),
    {
      permission: Permissions.Forms.Edit,
      background: true,
      formId,
      fallbackMessage: "Failed to save the test participants.",
      logMessage: "Failed to save test participant values from the designer.",
      loggerName: "audience.variables.save",
    },
  );
}
