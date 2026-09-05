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
import { FILE_KINDS } from "@/lib/file-kinds";
import type { BuiltInExportFileKind } from "@/lib/endatix-api/reporting/reporting-export-wire";
import {
  buildLegacyExportUrl,
  buildReportingExportUrl,
  type SubmissionExportListFilters,
} from "../../export-url";
import { useSubmissionsExport } from "../use-submissions-export.hook";
import { useTenantExportFormats } from "../use-tenant-export-formats.hook";
import { ExportSubmissionsDialog } from "./export-dialog";

interface ExportSubmissionsButtonProps {
  formId: string;
  className?: string;
  disabled?: boolean;
  useReportingExport?: boolean;
  listFilters?: SubmissionExportListFilters;
}

function ExportButtonContents({
  isExporting,
}: Readonly<{ isExporting: boolean }>) {
  return (
    <>
      {isExporting ? <Spinner /> : <Download />}
      <span className="sr-only sm:not-sr-only">
        {isExporting ? "Exporting..." : "Export Submissions"}
      </span>
    </>
  );
}

export function ExportSubmissionsButton({
  formId,
  className,
  disabled = false,
  useReportingExport = false,
  listFilters,
}: Readonly<ExportSubmissionsButtonProps>) {
  if (useReportingExport) {
    return (
      <ReportingExportSubmissionsButton
        formId={formId}
        className={className}
        disabled={disabled}
        listFilters={listFilters}
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
  listFilters,
}: Readonly<Omit<ExportSubmissionsButtonProps, "useReportingExport">>) {
  const { isExporting, runExport } = useSubmissionsExport();
  const { options, groups, isLoading, isEmpty, loadError } =
    useTenantExportFormats();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = async (
    formatKey: string,
    exportName: string,
    exportFormatId: string,
    fallbackExtension: string,
    filters: SubmissionExportListFilters,
  ): Promise<{ succeeded: boolean; message?: string }> => {
    const selected = options.find(
      (option) => option.exportFormatId === exportFormatId,
    );

    return runExport({
      exportName,
      fallbackFilename: `form-${formId}-submissions.${fallbackExtension}`,
      url: buildReportingExportUrl({
        formId,
        formatKey,
        exportFormatId,
        listFilters: filters,
        allowedFilters: selected?.allowedFilters,
      }),
      suppressToasts: true,
    });
  };
  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Spinner />
        <span className="sr-only sm:not-sr-only">Loading...</span>
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
          <Download />
          <span className="sr-only sm:not-sr-only">
            Configure export formats
          </span>
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={disabled || isExporting}
        className={className}
        title={loadError ?? undefined}
        onClick={() => setDialogOpen(true)}
      >
        <ExportButtonContents isExporting={isExporting} />
      </Button>

      <ExportSubmissionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formId={formId}
        groups={groups}
        listFilters={listFilters}
        isExporting={isExporting}
        onExport={async ({
          formatKey,
          exportName,
          exportFormatId,
          fallbackExtension,
          filters,
        }) =>
          handleExport(
            formatKey,
            exportName,
            exportFormatId,
            fallbackExtension,
            filters,
          )
        }
      />
    </>
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

  const handleExport = (
    exportId?: string,
    exportName?: string,
    format: BuiltInExportFileKind = FILE_KINDS.csv.key,
  ) =>
    runExport({
      exportName: exportName ?? null,
      fallbackFilename: `form-${formId}-submissions.${FILE_KINDS[format].extension}`,
      url: buildLegacyExportUrl(formId, exportId, format),
    });

  if (isLoadingSettings) {
    return (
      <Button variant="outline" disabled className={className}>
        <Spinner />
        <span className="sr-only sm:not-sr-only">Loading...</span>
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
          <ExportButtonContents isExporting={isExporting} />
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            handleExport(undefined, FILE_KINDS.csv.label, FILE_KINDS.csv.key)
          }
          disabled={disabled || isExporting}
        >
          {isExporting && currentExportName === FILE_KINDS.csv.label ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {FILE_KINDS.csv.label}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            handleExport(undefined, FILE_KINDS.xlsx.label, FILE_KINDS.xlsx.key)
          }
          disabled={disabled || isExporting}
        >
          {isExporting && currentExportName === FILE_KINDS.xlsx.label ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Excel (XLSX)
        </DropdownMenuItem>

        {customExports.length > 0 ? (
          <>
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
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
