"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export type ListFormReportingLocalesResult = Result<string[]>;

export async function listFormReportingLocalesAction(
  formId: string,
): Promise<ListFormReportingLocalesResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.reporting.getFormSchemaLocales(formId);

  return toResult(apiResult, {
    fallbackMessage: "Failed to load form locales for export.",
    logMessage: "Failed to load form reporting locales for export.",
    loggerName: "export.list-form-reporting-locales",
    mapData: (data) => {
      const locales = data.locales?.filter(
        (locale): locale is string =>
          typeof locale === "string" && locale.trim().length > 0,
      );

      return locales && locales.length > 0 ? locales : ["default"];
    },
  });
}
