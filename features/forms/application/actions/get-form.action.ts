"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { toResult, type Result } from "@/lib/result";
import { EndatixApi } from "@/lib/endatix-api";
import type { Form } from "@/types";

export type GetFormResult = Result<Form>;

/** A fresh read of one form for a client overlay that opened on a list row. */
export async function getFormAction(formId: string): Promise<GetFormResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  return toResult(
    await new EndatixApi(session?.accessToken).forms.get(formId),
    {
      fallbackMessage: "Failed to load form.",
      logMessage: "Failed to load form for the preview.",
      loggerName: "forms.preview",
    },
  );
}
