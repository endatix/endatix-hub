import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ExportFormatsSettings } from "@/features/export/manage-export-formats";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  ColumnAliasNamingConventionDto,
  ExportCapabilityDto,
  ExportFormatListItem,
  ExportMappingListItem,
} from "@/lib/endatix-api/reporting/reporting";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { normalizeExportCapabilities } from "@/lib/endatix-api/reporting/normalize-export-capabilities";
import { normalizeExportNamingConventions } from "@/lib/endatix-api/reporting/normalize-export-naming-conventions";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function getExportFormats(
  token?: string,
): Promise<ExportFormatListItem[]> {
  const api = new EndatixApi(token);
  const apiResult = await api.reporting.exportFormats.list();
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load export formats.",
    logMessage: "Failed to load export formats settings.",
    loggerName: "settings.export-formats",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}

async function getExportCapabilities(
  token?: string,
): Promise<ExportCapabilityDto[]> {
  const api = new EndatixApi(token);
  const apiResult = await api.reporting.exportCapabilities.list();
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load export capabilities.",
    logMessage: "Failed to load export capabilities settings.",
    loggerName: "settings.export-capabilities",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return normalizeExportCapabilities(result.value);
}

async function getExportNamingConventions(
  token?: string,
): Promise<ColumnAliasNamingConventionDto[]> {
  const api = new EndatixApi(token);
  const apiResult = await api.reporting.exportNamingConventions.list();
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load column naming conventions.",
    logMessage: "Failed to load export naming conventions settings.",
    loggerName: "settings.export-naming-conventions",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return normalizeExportNamingConventions(result.value);
}

async function getExportMappings(
  token?: string,
): Promise<ExportMappingListItem[]> {
  const api = new EndatixApi(token);
  const apiResult = await api.reporting.exportMappings.list();
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load export mappings.",
    logMessage: "Failed to load export mappings settings.",
    loggerName: "settings.export-mappings",
  });

  if (Result.isError(result)) {
    throw new DataLoadError(result.message);
  }

  return result.value;
}

function ExportFormatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function SettingsOrganizationExportFormatsPage() {
  const session = await auth();
  const { requireHubAccess, evaluatePermissions } =
    await authorization(session);

  await requireHubAccess();

  const reportingExportEnabled = await reportingExportFlag();
  if (!reportingExportEnabled) {
    redirect("/settings");
  }

  const permissionsResult = await evaluatePermissions([
    Permissions.Tenant.ManageSettings,
  ]);

  if (
    !permissionsResult.success ||
    !permissionsResult.data[Permissions.Tenant.ManageSettings]
  ) {
    return <UnauthorizedComponent variant="card" />;
  }

  const formatsPromise = getExportFormats(session?.accessToken);
  const mappingsPromise = getExportMappings(session?.accessToken);
  const capabilitiesPromise = getExportCapabilities(session?.accessToken);
  const namingConventionsPromise = getExportNamingConventions(
    session?.accessToken,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Export formats
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Configure tenant export formats and choose the default format for
          submission exports.
        </p>
      </div>
      <Suspense fallback={<ExportFormatsSkeleton />}>
        <ExportFormatsSettings
          formatsPromise={formatsPromise}
          mappingsPromise={mappingsPromise}
          capabilitiesPromise={capabilitiesPromise}
          namingConventionsPromise={namingConventionsPromise}
        />
      </Suspense>
    </div>
  );
}
