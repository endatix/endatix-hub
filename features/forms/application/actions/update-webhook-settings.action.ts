"use server";

import { createPermissionService } from "@/features/auth/permissions/application";
import { updateForm } from "@/services/api";
import type { WebHookConfiguration } from "@/types";
import {
  EVENT_KEYS,
  WebhookSettingsSchema,
} from "./types/webhook-settings.types";
import type { WebhookSettingsState } from "./types/webhook-settings.types";

export async function updateWebhookSettingsAction(
  _prevState: WebhookSettingsState,
  formData: FormData
): Promise<WebhookSettingsState | never> {
  const { requireHubAccess } = await createPermissionService();
  await requireHubAccess();

  const rawData: Record<string, string | boolean> = {
    formId: formData.get("formId") as string,
    useCustomSettings: formData.get("useCustomSettings") === "true",
  };

  EVENT_KEYS.forEach((eventKey) => {
    const enabledValue = formData.get(`event-${eventKey}-enabled`);
    const urlValue = formData.get(`event-${eventKey}-url`);

    rawData[`event-${eventKey}-enabled`] = enabledValue === "true";
    rawData[`event-${eventKey}-url`] = (urlValue as string) || "";
  });

  const validatedData = WebhookSettingsSchema.safeParse(rawData);
  const errors = validatedData.error?.flatten();

  if (!validatedData.success) {
    return {
      isSuccess: false,
      formErrors: errors?.formErrors,
      errors: errors?.fieldErrors,
      values: rawData,
    };
  }

  try {
    const { formId, useCustomSettings } = validatedData.data;
    let webHookSettingsJson: string = "";

    if (useCustomSettings) {
      const config: WebHookConfiguration = { Events: {} };

      EVENT_KEYS.forEach((eventKey) => {
        const enabled = validatedData.data[`event-${eventKey}-enabled` as keyof typeof validatedData.data];
        const url = validatedData.data[`event-${eventKey}-url` as keyof typeof validatedData.data] as string;

        if (enabled && url) {
          config.Events[eventKey] = {
            IsEnabled: true,
            WebHookEndpoints: [{ Url: url }],
          };
        }
      });

      webHookSettingsJson = JSON.stringify(config);
    }

    await updateForm(formId, {
      webHookSettingsJson: webHookSettingsJson,
    });

    return {
      isSuccess: true,
    };
  } catch (error) {
    console.error("Failed to update webhook settings", error);

    let errorMessage = "Failed to update webhook settings";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      isSuccess: false,
      formErrors: [errorMessage],
      errors: errors?.fieldErrors,
      values: rawData,
    };
  }
}
