"use server";

import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export type DeleteAudiencePersonResult = Result<void>;

export async function deleteAudiencePersonAction(
  formId: string,
  membershipId: string,
): Promise<DeleteAudiencePersonResult> {
  return withHubAudienceApi(
    (api) => api.audience.deletePerson(formId, membershipId),
    {
      fallbackMessage: "Failed to remove audience person.",
      logMessage: "Failed to remove audience person.",
      loggerName: "audience.people.delete",
      formId,
    },
  );
}
