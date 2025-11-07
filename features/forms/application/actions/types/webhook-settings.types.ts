import { z } from "zod";

export const EVENT_KEYS = [
  "SubmissionCompleted",
  "FormCreated",
  "FormUpdated",
  "FormEnabledStateChanged",
  "FormDeleted",
] as const;

const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
};

export const WebhookSettingsSchema = z
  .object({
    formId: z.string().min(1, "Form ID is required"),
    useCustomSettings: z.boolean(),
    "event-SubmissionCompleted-enabled": z.boolean().optional(),
    "event-SubmissionCompleted-url": z.string().optional(),
    "event-FormCreated-enabled": z.boolean().optional(),
    "event-FormCreated-url": z.string().optional(),
    "event-FormUpdated-enabled": z.boolean().optional(),
    "event-FormUpdated-url": z.string().optional(),
    "event-FormEnabledStateChanged-enabled": z.boolean().optional(),
    "event-FormEnabledStateChanged-url": z.string().optional(),
    "event-FormDeleted-enabled": z.boolean().optional(),
    "event-FormDeleted-url": z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.useCustomSettings) return;

    EVENT_KEYS.forEach((eventKey) => {
      const enabledField = `event-${eventKey}-enabled` as keyof typeof data;
      const urlField = `event-${eventKey}-url` as keyof typeof data;
      const enabled = data[enabledField];
      const url = data[urlField] as string;

      if (enabled) {
        if (!url || url === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "URL is required for enabled events",
            path: [urlField],
          });
        } else if (!isValidUrl(url)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid URL format (must be http:// or https://)",
            path: [urlField],
          });
        }
      }
    });
  });

export interface WebhookSettingsState {
  isSuccess?: boolean;
  formErrors?: string[];
  errors?: {
    [key: string]: string[];
  };
  values?: {
    formId?: string;
    useCustomSettings?: boolean;
    [key: string]: string | boolean | undefined;
  };
}
