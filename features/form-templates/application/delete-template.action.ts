"use server";

import { authorization } from "@/features/auth/authorization";
import { Result, toResult } from "@/lib/result";
import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { revalidatePath } from "next/cache";

export type DeleteFormResult = Result<string>;

export async function deleteTemplateAction(
  templateId: string,
): Promise<DeleteFormResult | never> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();
  const api = new EndatixApi((await auth())?.accessToken);
  const result = toResult(
    await api.formTemplates.delete(templateId),
    {
      mapData: () => templateId,
      fallbackMessage: "Failed to delete form template",
      logMessage: "Failed to delete form template",
      loggerName: "form-templates.delete",
    },
  );
  if (Result.isSuccess(result)) revalidatePath("/(main)/form-templates");
  return result;
}
