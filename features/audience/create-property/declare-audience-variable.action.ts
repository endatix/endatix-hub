"use server";

import { Permissions } from "@/features/auth/authorization";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const DECLARE_LOG = {
  permission: Permissions.Forms.Edit,
  background: true,
  fallbackMessage: "Failed to add the Audience property.",
  logMessage: "Failed to add an Audience property from the designer.",
  loggerName: "audience.properties.declare",
} as const;

/**
 * Add as Audience property, from the designer's Diagnostics: a text Property named after a `{name}`
 * nothing declares, so its variable name is that name. Runs inside the designer: a redirect would
 * throw away the author's unsaved edits.
 */
export async function declareAudienceVariableAction(
  formId: string,
  variable: string,
): Promise<Result<AudienceProperty>> {
  const name = variable.trim();
  if (!name) return Result.validationError("Property name is required");

  return withHubAudienceApi(
    (api) =>
      api.audience.createProperty(formId, {
        name,
        dataType: AudienceDataType.Text,
        allowsOther: false,
      }),
    { ...DECLARE_LOG, formId },
  );
}
