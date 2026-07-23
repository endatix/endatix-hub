"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { TelemetryLogger } from "@/features/telemetry";
import { getExportFailureMessage } from "../export-error-message";
import { downloadSubmissionsExport } from "./download-submissions-export";

const LOGGER_NAME = "export.submissions-export";

export type SubmissionsExportResult =
  | { succeeded: true }
  | { succeeded: false; message: string };

/**
 * Options for running a submissions export.
 * @param exportName - The name of the export.
 * @param fallbackFilename - The fallback filename to use if the export name is not provided.
 * @param url - The URL to download the export from.
 * @param suppressToasts - When true, skip toast feedback (dialog owns messaging).
 */
interface RunSubmissionsExportOptions {
  exportName?: string | null;
  fallbackFilename: string;
  url: string;
  suppressToasts?: boolean;
}

/**
 * Hook to manage the state of the submissions export process.
 * @returns An object containing the current export name, whether it is exporting, and a function to run the export.
 */
export function useSubmissionsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [currentExportName, setCurrentExportName] = useState<string | null>(
    null,
  );

  const runExport = async ({
    exportName = null,
    fallbackFilename,
    url,
    suppressToasts = false,
  }: RunSubmissionsExportOptions): Promise<SubmissionsExportResult> => {
    try {
      setIsExporting(true);
      setCurrentExportName(exportName);

      if (!suppressToasts) {
        toast.info({
          title: "Starting export",
          description: "Preparing your file for download...",
        });
      }

      await downloadSubmissionsExport(url, fallbackFilename);

      if (!suppressToasts) {
        toast.success({
          title: "Export successful",
          description: "Your file has been downloaded successfully.",
        });
      }
      return { succeeded: true };
    } catch (error) {
      const message = getExportFailureMessage(error);
      TelemetryLogger.error(
        "Submissions export failed",
        undefined,
        {
          "export.has_name": Boolean(exportName?.trim()),
          "export.fallback_filename_length": fallbackFilename.length,
          "error.type": error instanceof Error ? error.name : typeof error,
        },
        LOGGER_NAME,
      );
      if (!suppressToasts) {
        toast.error({
          title: "Export failed",
          description: message,
        });
      }
      return { succeeded: false, message };
    } finally {
      setIsExporting(false);
      setCurrentExportName(null);
    }
  };

  return { currentExportName, isExporting, runExport };
}
