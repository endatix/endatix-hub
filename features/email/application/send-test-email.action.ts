"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";

export async function sendTestEmailAction(
  _prevState: ApiResult<string> | null,
  formData: FormData,
): Promise<ApiResult<string>> {
  const session = await auth();
  const { requirePlatformAdmin } = await authorization(session);
  await requirePlatformAdmin();

  const toEmail = formData.get("toEmail") as string;
  const rawTemplateId = formData.get("templateId") as string | null;
  const templateId =
    !rawTemplateId || rawTemplateId === "__none__" ? undefined : rawTemplateId;

  const endatixApi = new EndatixApi(session?.accessToken);
  const result = await endatixApi.email.sendTestEmail({
    toEmail,
    templateId,
  });

  return result;
}
