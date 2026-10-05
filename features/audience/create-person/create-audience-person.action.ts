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

/** Trimmed, without blanks: the API stores values as written and refuses padded numbers. */
function withoutBlankValues(
  values: AudiencePropertyValues = {},
): AudiencePropertyValues {
  return Object.fromEntries(
    Object.entries(values)
      .map(([propertyId, value]) => [propertyId, value.trim()] as const)
      .filter(([, value]) => value !== ""),
  );
}

export async function createAudiencePersonAction(
  input: CreateAudiencePersonInput,
): Promise<CreateAudiencePersonResult> {
  const identifier = input.identifier.trim();
  if (!identifier) return Result.validationError("Identifier is required");

  return withHubAudienceApi(
    (api) =>
      api.audience.createPerson(input.formId, {
        identifier,
        values: withoutBlankValues(input.values),
      }),
    CREATE_LOG,
  );
}
