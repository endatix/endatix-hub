import type { TenantExportOptionGroup } from "../map-tenant-export-options";

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
