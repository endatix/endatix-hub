"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getStringFormValue } from "@/lib/utils/form-data-utils";

export async function sendTestEmailAction(
  _prevState: ApiResult<string> | null,
  formData: FormData,
): Promise<ApiResult<string>> {
  const session = await auth();
  const { requirePlatformAdmin } = await authorization(session);
  await requirePlatformAdmin();

  const toEmail = getStringFormValue(formData, "toEmail");
  const fromEmail = getStringFormValue(formData, "fromEmail");
  const rawTemplateId = getStringFormValue(formData, "templateId");
  const templateId =
    !rawTemplateId || rawTemplateId === "__none__" ? undefined : rawTemplateId;

  const endatixApi = new EndatixApi(session?.accessToken);
  const result = await endatixApi.email.sendTestEmail({
    toEmail,
    fromEmail,
    templateId,
  });

  return result;
}
