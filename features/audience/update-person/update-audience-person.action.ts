"use server";

import type {
  AudiencePerson,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export type UpdateAudiencePersonInput = {
  formId: string;
  membershipId: string;
  values: AudiencePropertyValues;
};

export type UpdateAudiencePersonResult = Result<AudiencePerson>;

export async function updateAudiencePersonAction(
  input: UpdateAudiencePersonInput,
): Promise<UpdateAudiencePersonResult> {
  return withHubAudienceApi(
    (api) =>
      api.audience.updatePerson(input.formId, input.membershipId, {
        values: input.values,
      }),
    {
      fallbackMessage: "Failed to update audience person.",
      logMessage: "Failed to update audience person.",
      loggerName: "audience.people.update",
      formId: input.formId,
    },
  );
}
