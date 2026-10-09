"use server";

import type {
  AudienceProperty,
  AudienceDataType,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export type CreateAudiencePropertyInput = {
  formId: string;
  name: string;
  dataType: AudienceDataType;
  choicesJson?: string | null;
  allowsOther?: boolean;
};

export type CreateAudiencePropertyResult = Result<AudienceProperty>;

const CREATE_LOG = {
  fallbackMessage: "Failed to create audience property.",
  logMessage: "Failed to create audience property.",
  loggerName: "audience.properties.create",
} as const;

export async function createAudiencePropertyAction(
  input: CreateAudiencePropertyInput,
): Promise<CreateAudiencePropertyResult> {
  const name = input.name.trim();
  if (!name) return Result.validationError("Property name is required");

  return withHubAudienceApi(
    (api) =>
      api.audience.createProperty(input.formId, {
        name,
        dataType: input.dataType,
        choicesJson: input.choicesJson,
        allowsOther: input.allowsOther ?? false,
      }),
    { ...CREATE_LOG, formId: input.formId },
  );
}
