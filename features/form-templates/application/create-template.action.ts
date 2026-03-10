"use server";

import { authorization } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import { CreateFormTemplateRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { createFormTemplate } from "@/services/api";
import { revalidatePath } from "next/cache";

const LOGGER_NAME = "form-templates";

export async function createTemplateAction(
  formData: FormData,
): Promise<Result<string> | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const name = formData.get("name")?.toString() || "";
    const description = formData.get("description")?.toString() || "";

    if (!name || name.trim().length === 0) {
      return Result.error("Template name is required");
    }

    const templateData: CreateFormTemplateRequest = {
      name,
      jsonData: JSON.stringify({}),
      description,
    };

    const result = await createFormTemplate(templateData);

    if (!result || !result.isSuccess) {
      TelemetryLogger.error(
        "Failed to create form template",
        undefined,
        { apiError: result?.error },
        LOGGER_NAME,
      );
      return Result.error("Failed to create template");
    }

    revalidatePath("/(main)/forms/templates");

    if (!result.formTemplateId) {
      TelemetryLogger.error(
        "Create form template succeeded but no template ID returned",
        undefined,
        {},
        LOGGER_NAME,
      );
      return Result.error("Failed to create template");
    }

    TelemetryLogger.info(
      "Form template created",
      { templateId: result.formTemplateId },
      LOGGER_NAME,
    );
    return Result.success(result.formTemplateId);
  } catch (error) {
    TelemetryLogger.critical(
      "Create form template failed",
      error,
      {},
      LOGGER_NAME,
    );
    return Result.error("Failed to create template");
  }
}
