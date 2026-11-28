"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { formPublishFlag } from "@/lib/feature-flags/form-publish.server";
import { Result, toResult } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { revalidatePath } from "next/cache";

const grants = [Permissions.Access.Hub, Permissions.Forms.Edit];
const logging = { fallbackMessage: "Could not save form.", logMessage: "Form save failed.", loggerName: "forms.design" };

async function sameEditor(access: Awaited<ReturnType<typeof authorization>>, formId: string, scope: string) {
  const actor = await access.getAuthorizationData();
  return actor.success && JSON.stringify([actor.data.tenantId, actor.data.userId, formId]) === scope;
}

/** Compatibility writer for deployments still using immediate publication. */
export async function saveActiveDefinitionAction(
  formId: string,
  jsonData: string,
  scope: string,
) {
  const session = await auth();
  const access = await authorization(session);
  await access.requireAllPermissions(grants);
  if (!await sameEditor(access, formId, scope)) return Result.error("Sign in to the account that opened this form before saving.");
  if (await formPublishFlag())
    return Result.error("The editor mode changed.", undefined, "editor_mode_changed");
  const id = validateEndatixId(formId, "formId");
  if (Result.isError(id)) return id;
  const api = new EndatixApi(session?.accessToken);
  const response = await api.patch(`/forms/${id.value}/definition`, { isDraft: false, jsonData });
  const result = toResult(response, logging);
  if (Result.isSuccess(result))
    revalidatePath(`/(main)/forms/${id.value}/design`);
  return result;
}
