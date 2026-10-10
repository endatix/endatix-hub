"use server";

import type {
  AudienceIdentifierKind,
  AudienceSettings,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

export type UpdateAudienceSettingsResult = Result<AudienceSettings>;

/** Tenant-wide: the match key applies to every form, so no single form's page is refreshed. */
export async function updateAudienceSettingsAction(
  identifierKind: AudienceIdentifierKind,
): Promise<UpdateAudienceSettingsResult> {
  return withHubAudienceApi(
    (api) => api.audience.updateSettings({ identifierKind }),
    {
      fallbackMessage: "Failed to update audience settings.",
      logMessage: "Failed to update audience settings.",
      loggerName: "audience.settings.update",
    },
  );
}
