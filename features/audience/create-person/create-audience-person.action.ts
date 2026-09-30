"use server";

import type {
  AudiencePerson,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export type CreateAudiencePersonInput = {
  formId: string;
  identifier: string;
  values?: AudiencePropertyValues;
};

export type CreateAudiencePersonResult = Result<AudiencePerson>;

const CREATE_LOG = {
  fallbackMessage: "Failed to add audience person.",
  logMessage: "Failed to add audience person.",
  loggerName: "audience.people.create",
} as const;

export async function createAudiencePersonAction(
  input: CreateAudiencePersonInput,
): Promise<CreateAudiencePersonResult> {
  const identifier = input.identifier.trim();
  if (!identifier) return Result.validationError("Identifier is required");

  return withHubAudienceApi(
    (api) =>
      api.audience.createPerson(input.formId, {
        identifier,
        values: input.values,
      }),
    CREATE_LOG,
  );
}
