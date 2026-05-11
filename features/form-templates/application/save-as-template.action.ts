"use server";

import { authorization } from "@/features/auth";
import { TelemetryLogger } from "@/features/telemetry";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { getActiveFormDefinition } from "@/services/api";
import { auth } from "@/auth";

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
    const session = await auth();
    const api = new EndatixApi(session?.accessToken);
    const templateResult = await api.formTemplates.create({
      name: request.name,
      description: request.description || "",
      jsonData: formDefinition.jsonData,
    });

    if (ApiResult.isError(templateResult)) {
      return Result.error(
        templateResult.error.message || "Failed to create template",
      );
    }

    if (templateResult.data.id) {
      return Result.success(templateResult.data.id);
    }

    return Result.error("Failed to create template");
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
