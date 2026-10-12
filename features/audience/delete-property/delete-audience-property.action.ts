"use server";

import { Permissions } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

export type DeleteAudiencePropertyResult = Result<void>;

export async function deleteAudiencePropertyAction(
  formId: string,
  propertyId: string,
): Promise<DeleteAudiencePropertyResult> {
  return withHubAudienceApi(
    (api) => api.audience.deleteProperty(formId, propertyId),
    {
      permission: Permissions.Forms.Edit,
      fallbackMessage: "Failed to delete audience property.",
      logMessage: "Failed to delete audience property.",
      loggerName: "audience.properties.delete",
      formId,
    },
  );
}
