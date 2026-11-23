"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { FormPdfSettings } from "@/lib/endatix-api/forms/types";
import { Result, toResult } from "@/lib/result";
import { revalidatePath } from "next/cache";

export async function savePdfSettings(
  formId: string,
  settings: FormPdfSettings,
) {
  const session = await auth();
  const { requireAllPermissions } = await authorization(session);
  await requireAllPermissions([Permissions.Access.Hub, Permissions.Forms.Edit]);
  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.forms.updatePdfSettings(formId, settings), {
    fallbackMessage: "Could not save PDF settings.",
    logMessage: "PDF settings update failed.",
    loggerName: "forms.pdf-settings",
  });
  if (Result.isSuccess(result)) revalidatePath(`/forms/${formId}/settings`);
  return result;
}
