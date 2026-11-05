"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import {
  EVENT_KEYS,
  WebhookSettingsSchema,
} from "./types/webhook-settings.types";
import type { WebhookSettingsState } from "./types/webhook-settings.types";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { buildWebhookConfiguration } from "../webhook-settings-document";

export async function updateWebhookSettingsAction(
  _prevState: WebhookSettingsState,
  formData: FormData,
): Promise<WebhookSettingsState | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
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

  if (!validatedData.success) {
    return ServerActionState.fromZodError(validatedData.error, rawData);
  }

  const { formId, useCustomSettings } = validatedData.data;
  let webHookSettingsJson: string = "";

  if (useCustomSettings) {
    webHookSettingsJson = JSON.stringify(
      buildWebhookConfiguration(validatedData.data),
    );
  }

  const api = new EndatixApi(session?.accessToken);
  const result = await api.forms.update(formId, { webHookSettingsJson });

  if (!result.success) {
    console.error("Failed to update webhook settings", result.error);
    return {
      isSuccess: false,
      formErrors: [result.error.message],
      errors: undefined,
      data: rawData,
    };
  }

  return {
    isSuccess: true,
  };
}
