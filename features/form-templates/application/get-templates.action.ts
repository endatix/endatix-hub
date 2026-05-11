"use server";

import { FormTemplate } from "@/types";
import { Result } from "@/lib/result";
import { authorization } from "@/features/auth/authorization";
import { auth } from "@/auth";
import { EndatixApi, ApiResult } from "@/lib/endatix-api";

export type GetTemplatesResult = Result<FormTemplate[]>;

export async function getTemplatesAction(): Promise<
  GetTemplatesResult | never
> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  try {
    const session = await auth();
    const api = new EndatixApi(session?.accessToken);
    const templatesResult = await api.formTemplates.list();
    if (ApiResult.isError(templatesResult)) {
      return Result.error(templatesResult.error.message);
    }

    return Result.success(templatesResult.data);
  } catch {
    return Result.error("Failed to fetch form templates");
  }
}
