import { Form } from "@/types";
import { getForm } from "@/services/api";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { FormAudienceNotFound } from "@/features/audience/ui/form-audience-not-found";
import {
  getAudiencePageAction,
  type AudiencePageData,
} from "@/features/audience/get-audience-page";
import { Result } from "@/lib/result";
import { TelemetryLogger } from "@/features/telemetry";
import type { ReactNode } from "react";

export type AudienceView =
  | { kind: "not-found" }
  | { kind: "error"; node: ReactNode }
  | { kind: "ok"; form: Form; data: AudiencePageData };

async function loadForm(formId: string): Promise<Form | null> {
  try {
    return await getForm(formId);
  } catch (error) {
    TelemetryLogger.error(
      "Failed to load form for audience",
      error,
      { formId },
      "audience.page",
    );
    return null;
  }
}

export async function loadAudienceView(formId: string): Promise<AudienceView> {
  const form = await loadForm(formId);
  if (!form) {
    return { kind: "not-found" };
  }

  const audienceResult = await getAudiencePageAction(formId);
  if (Result.isError(audienceResult)) {
    return audienceResult.statusCode === 404
      ? { kind: "not-found" }
      : { kind: "error", node: <HubPageLoadError result={audienceResult} /> };
  }

  return { kind: "ok", form, data: audienceResult.value };
}
