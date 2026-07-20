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
  type SubmissionExportListFilters,
} from "../../export-url";
import { useSubmissionsExport } from "../use-submissions-export.hook";
import { useTenantExportFormats } from "../use-tenant-export-formats.hook";
import { ExportSubmissionsDialog } from "./custom-export-dialog";

interface ExportSubmissionsButtonProps {
  formId: string;
  className?: string;
  disabled?: boolean;
  useReportingExport?: boolean;
  listFilters?: SubmissionExportListFilters;
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
  const { groups, isLoading, isEmpty, loadError } = useTenantExportFormats();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = async (
    wireKey: string,
    exportName: string,
    exportFormatId: string,
    fallbackExtension: string,
    filters: SubmissionExportListFilters,
  ): Promise<boolean> =>
    runExport({
      exportName,
      fallbackFilename: `form-${formId}-submissions.${fallbackExtension}`,
      url: buildReportingExportUrl({
        formId,
        wireKey,
        exportFormatId,
        listFilters: filters,
      }),
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
    <>
      <Button
        variant="outline"
        disabled={disabled || isExporting}
        className={className}
        title={loadError ?? undefined}
        onClick={() => setDialogOpen(true)}
      >
        {isExporting ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isExporting ? "Exporting..." : "Export Submissions"}
      </Button>

      <ExportSubmissionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groups={groups}
        listFilters={listFilters}
        isExporting={isExporting}
        onExport={async ({
          wireKey,
          exportName,
          exportFormatId,
          fallbackExtension,
          filters,
        }) => {
          const succeeded = await handleExport(
            wireKey,
            exportName,
            exportFormatId,
            fallbackExtension,
            filters,
          );
          if (succeeded) {
            setDialogOpen(false);
          }
        }}
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
