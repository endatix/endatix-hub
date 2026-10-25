"use server";

import { Permissions } from "@/features/auth/authorization";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { declaresAsProperty } from "@/lib/personalization/coverage";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const NOT_A_NAME =
  "A Property name here uses letters, digits and single underscores, so its variable is that name.";

const DECLARE_LOG = {
  permission: Permissions.Forms.Edit,
  // Runs inside the designer: a redirect would throw away the author's unsaved edits, and a
  // revalidation would render the whole design page again for a write the binding reads back.
  background: true,
  fallbackMessage: "Failed to add the Audience property.",
  logMessage: "Failed to add an Audience property from the designer.",
  loggerName: "audience.properties.declare",
} as const;

/**
 * Add as Audience property, from the designer's Diagnostics: a text Property named after a `{name}`
 * nothing declares, so its variable name is that name.
 */
export async function declareAudienceVariableAction(
  formId: string,
  variable: string,
): Promise<Result<AudienceProperty>> {
  const name = variable.trim();
  if (!declaresAsProperty(name)) return Result.validationError(NOT_A_NAME);

  return withHubAudienceApi(
    (api) =>
      api.audience.createProperty(formId, {
        name,
        dataType: AudienceDataType.Text,
        allowsOther: false,
      }),
    DECLARE_LOG,
  );
}
