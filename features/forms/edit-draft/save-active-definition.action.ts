"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { formPublishFlag } from "@/lib/feature-flags/flags";
import { Result, toResult } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { revalidatePath } from "next/cache";

/** Compatibility writer for deployments still using immediate publication. */
export async function saveActiveDefinitionAction(
  formId: string,
  jsonData: string,
) {
  const session = await auth();
  const access = await authorization(session);
  await access.requireAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.Edit,
  ]);
  if (await formPublishFlag())
    return Result.error("Draft editing is enabled. Reopen the designer.");
  const id = validateEndatixId(formId, "formId");
  if (Result.isError(id)) return id;
  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.patch(`/forms/${id.value}/definition`, {
      isDraft: false,
      jsonData,
    }),
    {
      fallbackMessage: "Could not save form.",
      logMessage: "Form save failed.",
      loggerName: "forms.design",
    },
  );
  if (Result.isSuccess(result))
    revalidatePath(`/(main)/forms/${id.value}/design`);
  return result;
}
