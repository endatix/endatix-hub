"use server";

import { Permissions } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

export type DeleteAudiencePersonResult = Result<void>;

export async function deleteAudiencePersonAction(
  formId: string,
  membershipId: string,
): Promise<DeleteAudiencePersonResult> {
  return withHubAudienceApi(
    (api) => api.audience.deletePerson(formId, membershipId),
    {
      permission: Permissions.Forms.Edit,
      fallbackMessage: "Failed to remove the participant.",
      logMessage: "Failed to remove the participant.",
      loggerName: "audience.people.delete",
      formId,
    },
  );
}
