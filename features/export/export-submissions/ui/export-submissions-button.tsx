"use client";

import Link from "next/link";
import type { Route } from "next";
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
import { useSubmissionsExport } from "../use-submissions-export.hook";
import { useTenantExportFormats } from "../use-tenant-export-formats.hook";

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
}: Readonly<ExportSubmissionsButtonProps>) {
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
}: Readonly<Omit<ExportSubmissionsButtonProps, "useReportingExport">>) {
  const { currentExportName, isExporting, runExport } = useSubmissionsExport();
  const { groups, isLoading, isEmpty, loadError } = useTenantExportFormats();

  const handleExport = (
    wireKey: string,
    exportName: string,
    exportFormatId: string,
    fallbackExtension: string,
  ) =>
    runExport({
      exportName,
      fallbackFilename: `form-${formId}-submissions.${fallbackExtension}`,
      url: buildReportingExportUrl(formId, wireKey, exportFormatId),
    });

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Spinner className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (isEmpty) {
    return (
      <Button
        variant="outline"
        disabled={disabled}
        className={className}
        asChild
      >
        <Link href={"/settings/organization/export-formats" as Route}>
          <Download className="mr-2 h-4 w-4" />
          Configure export formats
        </Link>
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
          title={loadError ?? undefined}
        >
          {isExporting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? "Exporting..." : "Export Submissions"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {groups.map((group, groupIndex) => (
          <div key={group.target}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            {groups.length > 1 ? (
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {group.label}
              </div>
            ) : null}
            {group.options.map(
              ({ wireKey, label, exportFormatId, fallbackExtension }) => (
                <DropdownMenuItem
                  key={exportFormatId}
                  onClick={() =>
                    handleExport(
                      wireKey,
                      label,
                      exportFormatId,
                      fallbackExtension,
                    )
                  }
                  disabled={disabled || isExporting}
                >
                  {isExporting && currentExportName === label ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {label}
                </DropdownMenuItem>
              ),
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LegacyExportSubmissionsButton({
  formId,
  className,
  disabled,
}: Readonly<Omit<ExportSubmissionsButtonProps, "useReportingExport">>) {
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
          {isExporting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isExporting ? "Exporting..." : "Export Submissions"}
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
