"use server";

import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

export type UpdateAudiencePropertyInput = {
  formId: string;
  propertyId: string;
  name?: string;
  sortOrder?: number;
};

export type UpdateAudiencePropertyResult = Result<AudienceProperty>;

const UPDATE_LOG = {
  fallbackMessage: "Failed to update audience property.",
  logMessage: "Failed to update audience property.",
  loggerName: "audience.properties.update",
} as const;

function validateUpdateInput(
  input: UpdateAudiencePropertyInput,
): Result<{ name?: string; sortOrder?: number }> {
  if (input.name === undefined && input.sortOrder === undefined) {
    return Result.validationError("Provide a name and/or sort order.");
  }
  const name = input.name?.trim();
  if (input.name !== undefined && !name) {
    return Result.validationError("Property name cannot be empty.");
  }
  return Result.success({ name, sortOrder: input.sortOrder });
}

export async function updateAudiencePropertyAction(
  input: UpdateAudiencePropertyInput,
): Promise<UpdateAudiencePropertyResult> {
  const validated = validateUpdateInput(input);
  if (Result.isError(validated)) return validated;

  return withHubAudienceApi(
    (api) =>
      api.audience.updateProperty(
        input.formId,
        input.propertyId,
        validated.value,
      ),
    { ...UPDATE_LOG, formId: input.formId },
  );
}
