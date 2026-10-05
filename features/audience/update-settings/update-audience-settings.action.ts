"use server";

import type {
  AudienceIdentifierKind,
  AudienceSettings,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export type UpdateAudienceSettingsResult = Result<AudienceSettings>;

export async function updateAudienceSettingsAction(
  formId: string,
  identifierKind: AudienceIdentifierKind,
): Promise<UpdateAudienceSettingsResult> {
  return withHubAudienceApi(
    (api) => api.audience.updateSettings({ identifierKind }),
    {
      fallbackMessage: "Failed to update audience settings.",
      logMessage: "Failed to update audience settings.",
      loggerName: "audience.settings.update",
      formId,
    },
  );
}
