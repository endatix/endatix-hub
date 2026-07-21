"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

export type ListFormReportingLocalesResult = Result<string[]>;

export async function listFormReportingLocalesAction(
  formId: string,
): Promise<ListFormReportingLocalesResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.reporting.getFormSchemaLocales(formId);
  if (!result.success) {
    return Result.error(
      result.error.message || "Failed to load form locales for export.",
    );
  }

  const locales = result.data.locales?.filter(
    (locale): locale is string =>
      typeof locale === "string" && locale.trim().length > 0,
  );

  return Result.success(locales && locales.length > 0 ? locales : ["default"]);
}
