import type { TenantExportOptionGroup } from "../map-tenant-export-options";
import { vi } from "vitest";
import * as downloads from "@/lib/utils/files-download";
import { Result } from "@/lib/result";

export const supportedLocales = Result.success(["default", "es", "fr"]);
export const preparedSchema = Result.success({
  formDefinitionId: "1",
  processed: 1,
  skipped: 0,
  failed: 0,
  batches: 1,
});
export const retainedConflict = {
  ...Result.error("The alias has conflicting meanings."),
  step: "compile",
  previousSchema: "retained",
  traceId: "conflict-ref",
};

/** Serves a complete attachment in the requested format; the save itself is stubbed. */
export function stubAttachments() {
  const request = vi.fn().mockImplementation(async (url: string) => {
    const json = !url.includes("format=csv");
    return new Response(json ? "[]" : "a,b", {
      headers: {
        "Content-Type": json ? "application/json" : "text/csv",
        "Content-Disposition": `attachment; filename="old.${json ? "json" : "csv"}"`,
      },
    });
  });
  vi.stubGlobal("fetch", request);
  vi.spyOn(downloads, "initiateFileDownload").mockImplementation(() => {});
  return request;
}

export const exportGroups: TenantExportOptionGroup[] = [
  {
    target: "Submissions",
    label: "Submissions",
    options: [
      {
        exportFormatId: "csv-1",
        formatKey: "csv",
        label: "CSV",
        fallbackExtension: "csv",
        exportTarget: "Submissions",
        profile: "Native",
        allowedFilters: [
          "includeTestSubmissions",
          "createdAtRange",
          "startedAtRange",
          "completedAtRange",
          "collectionStatus",
        ],
      },
      {
        exportFormatId: "json-1",
        formatKey: "json",
        label: "JSON",
        fallbackExtension: "json",
        exportTarget: "Submissions",
        profile: "Native",
        allowedFilters: [
          "includeTestSubmissions",
          "createdAtRange",
          "startedAtRange",
          "completedAtRange",
          "collectionStatus",
        ],
      },
    ],
  },
  {
    target: "Codebook",
    label: "Codebook",
    options: [
      {
        exportFormatId: "cb-native",
        formatKey: "codebook",
        label: "Native codebook",
        fallbackExtension: "json",
        exportTarget: "Codebook",
        profile: "Native",
        allowedFilters: [],
      },
      {
        exportFormatId: "cb-shoji",
        formatKey: "codebook-shoji",
        label: "Shoji codebook",
        fallbackExtension: "json",
        exportTarget: "Codebook",
        profile: "Shoji",
        allowedFilters: ["locale"],
      },
    ],
  },
];
