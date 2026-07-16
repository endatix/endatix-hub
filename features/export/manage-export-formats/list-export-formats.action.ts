"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { ExportFormatListItem } from "@/lib/endatix-api/reporting/reporting";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

const REPORTING_EXPORT_DISABLED_MESSAGE =
  "Reporting export is not enabled for this environment.";

export async function listTenantExportFormatsAction(): Promise<
  Result<ExportFormatListItem[]>
> {
  const session = await auth();
  const { evaluatePermissions } = await authorization(session);

  const reportingExportEnabled = await reportingExportFlag();
  if (!reportingExportEnabled) {
    return Result.error(REPORTING_EXPORT_DISABLED_MESSAGE);
  }

  const permissionsResult = await evaluatePermissions([
    Permissions.Tenant.ManageSettings,
    Permissions.Submissions.Export,
  ]);

  if (!permissionsResult.success) {
    return Result.error("Unauthorized.");
  }

  const permissions = permissionsResult.data;
  const canList =
    permissions[Permissions.Tenant.ManageSettings] ||
    permissions[Permissions.Submissions.Export];

  if (!canList) {
    return Result.error("Unauthorized.");
  }

  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.reporting.exportFormats.list();

  return toResult(apiResult, {
    fallbackMessage: "Failed to load export formats.",
    logMessage: "Failed to load tenant export formats.",
    loggerName: "export.list-export-formats",
  });
}
