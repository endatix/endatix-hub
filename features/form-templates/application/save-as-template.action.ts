"use server";

import { authorization } from "@/features/auth";
import { TelemetryLogger } from "@/features/telemetry";
import { Result } from "@/lib/result";
import { createFormTemplate, getActiveFormDefinition } from "@/services/api";

export type SaveAsTemplateRequest = {
  formId: string;
  name: string;
  description?: string;
};

const LOGGER_NAME = "form-templates";

export type SaveAsTemplateResult = Result<string>;

export async function saveAsTemplateAction(
  request: SaveAsTemplateRequest,
): Promise<SaveAsTemplateResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    // Get the form definition to use as template data
    const formDefinition = await getActiveFormDefinition(request.formId);

    if (!formDefinition || !formDefinition.jsonData) {
      return Result.error("Form definition not found or has no data");
    }

    // Create the template
    const templateResult = await createFormTemplate({
      name: request.name,
      description: request.description || "",
      jsonData: formDefinition.jsonData,
    });

    if (templateResult.isSuccess && templateResult.formTemplateId) {
      return Result.success(templateResult.formTemplateId);
    } else {
      return Result.error(templateResult.error || "Failed to create template");
    }
  } catch (error) {
    TelemetryLogger.error(
      "Failed to save form as template",
      error,
      {},
      LOGGER_NAME,
    );
    return Result.error("Failed to save form as template");
  }
}
