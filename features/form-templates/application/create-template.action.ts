"use server";

import { authorization } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import { CreateFormTemplateRequest } from "@/lib/form-types";
import { Result } from "@/lib/result";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { mapApiErrorToTelemetryAttributes } from "@/lib/result/map-api-error-to-telemetry-attributes";

const LOGGER_NAME = "form-templates";

export type CreateTemplateActionState = ServerActionState<{
  name?: string;
  description?: string;
  folderId?: string;
}> & {
  templateId?: string;
};

export async function createTemplateAction(
  _prevState: CreateTemplateActionState,
  formData: FormData,
): Promise<CreateTemplateActionState | never> {
  const rawData = extractTemplateData(formData);

  try {
    const { requireHubAccess } = await authorization();
    await requireHubAccess();

    const name = rawData.name;
    const description = rawData.description;
    const folderId = rawData.folderId;

    if (!name || name.trim().length === 0) {
      return {
        isSuccess: false,
        errors: { name: ["Template name is required"] },
        data: rawData,
      };
    }

    const templateData: CreateFormTemplateRequest = {
      name,
      jsonData: JSON.stringify({}),
      description,
      folderId: folderId.length > 0 ? folderId : null,
    };

    const session = await auth();
    const api = new EndatixApi(session?.accessToken);
    const result = await api.formTemplates.create(templateData);
    if (ApiResult.isError(result)) {
      TelemetryLogger.error(
        "Failed to create form template",
        undefined,
        mapApiErrorToTelemetryAttributes(result),
        LOGGER_NAME,
      );
      return {
        isSuccess: false,
        formErrors: [result.error.message || "Failed to create template"],
        data: rawData,
      };
    }

    revalidatePath("/(main)/forms/templates");

    if (!result.data.id) {
      TelemetryLogger.error(
        "Create form template succeeded but no template ID returned",
        undefined,
        {},
        LOGGER_NAME,
      );
      return {
        isSuccess: false,
        formErrors: ["Failed to create template"],
        data: rawData,
      };
    }

    TelemetryLogger.info(
      "Form template created",
      { templateId: result.data.id },
      LOGGER_NAME,
    );
    return {
      isSuccess: true,
      templateId: result.data.id,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to create template";
    TelemetryLogger.critical(
      "Create form template failed",
      error,
      {},
      LOGGER_NAME,
    );
    return {
      isSuccess: false,
      formErrors: [message],
      data: rawData,
    };
  }
}

function extractTemplateData(formData: FormData): {
  name: string;
  description: string;
  folderId: string;
} {
  return {
    name: formData.get("name")?.toString().trim() ?? "",
    description: formData.get("description")?.toString().trim() ?? "",
    folderId: formData.get("folderId")?.toString().trim() ?? "",
  };
}
