"use server";

import { Permissions } from "@/features/auth/authorization";
import type {
  AudiencePerson,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

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
      permission: Permissions.Forms.Edit,
      fallbackMessage: "Failed to update the participant.",
      logMessage: "Failed to update the participant.",
      loggerName: "audience.people.update",
      formId: input.formId,
    },
  );
}
