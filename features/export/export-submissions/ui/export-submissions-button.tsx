"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/loaders/spinner";
import { Download, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { getTenantSettingsAction } from "@/features/forms/application/actions/get-tenant-settings.action";
import type { CustomExportSettings } from "@/lib/endatix-api/tenant";
import { Result } from "@/lib/result";
import {
  buildLegacyExportUrl,
  buildReportingExportUrl,
} from "../../export-url";
import type { ReportingExportFormat } from "../../types";
import {
  HARDCODED_REPORTING_EXPORT_OPTIONS,
  getReportingExportFallbackExtension,
} from "../reporting-export-options";
import { useSubmissionsExport } from "../use-submissions-export.hook";

interface ExportSubmissionsButtonProps {
  formId: string;
  className?: string;
  disabled?: boolean;
  useReportingExport?: boolean;
}

export function ExportSubmissionsButton({
  formId,
  className,
  disabled = false,
  useReportingExport = false,
}: ExportSubmissionsButtonProps) {
  if (useReportingExport) {
    return (
      <ReportingExportSubmissionsButton
        formId={formId}
        className={className}
        disabled={disabled}
      />
    );
  }

  return (
    <LegacyExportSubmissionsButton
      formId={formId}
      className={className}
      disabled={disabled}
    />
  );
}

function ReportingExportSubmissionsButton({
  formId,
  className,
  disabled,
}: Omit<ExportSubmissionsButtonProps, "useReportingExport">) {
  const { currentExportName, isExporting, runExport } = useSubmissionsExport();

  const handleExport = (format: ReportingExportFormat, exportName: string) =>
    runExport({
      exportName,
      fallbackFilename: `form-${formId}-submissions.${getReportingExportFallbackExtension(format)}`,
      url: buildReportingExportUrl(formId, format),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting}
          className={className}
        >
          {isExporting && !currentExportName ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting && !currentExportName
            ? "Exporting..."
            : "Export Submissions"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {/* TODO(E10): Replace hardcoded options with tenant ExportFormats from API. */}
        {HARDCODED_REPORTING_EXPORT_OPTIONS.map(({ format, label }) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format, label)}
            disabled={disabled || isExporting}
          >
            {isExporting && currentExportName === label ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LegacyExportSubmissionsButton({
  formId,
  className,
  disabled,
}: Omit<ExportSubmissionsButtonProps, "useReportingExport">) {
  const { currentExportName, isExporting, runExport } = useSubmissionsExport();
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [customExports, setCustomExports] = useState<CustomExportSettings[]>(
    [],
  );

  useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        const result = await getTenantSettingsAction();

        if (Result.isSuccess(result)) {
          if (result.value.customExports) {
            setCustomExports(result.value.customExports);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tenant settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchTenantSettings();
  }, []);

  const handleExport = (exportId?: string, exportName?: string) =>
    runExport({
      exportName: exportName ?? null,
      fallbackFilename: `form-${formId}-submissions.csv`,
      url: buildLegacyExportUrl(formId, exportId),
    });

  if (isLoadingSettings) {
    return (
      <Button variant="outline" disabled className={className}>
        <Spinner className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (customExports.length === 0) {
    return (
      <Button
        variant="outline"
        onClick={() => handleExport()}
        disabled={disabled || isExporting}
        className={className}
      >
        {isExporting ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isExporting ? "Exporting..." : "Export Submissions"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting}
          className={className}
        >
          {isExporting && !currentExportName ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting && !currentExportName
            ? "Exporting..."
            : "Export Submissions"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport()}
          disabled={disabled || isExporting}
        >
          {isExporting && !currentExportName ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Default CSV Export
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {customExports.map((exportOption) => (
          <DropdownMenuItem
            key={exportOption.id}
            onClick={() => handleExport(exportOption.id, exportOption.name)}
            disabled={disabled || isExporting}
          >
            {isExporting && currentExportName === exportOption.name ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {exportOption.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
