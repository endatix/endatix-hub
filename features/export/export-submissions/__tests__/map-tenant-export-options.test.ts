import { describe, expect, it } from "vitest";
import type { ExportFormatListItem } from "@/lib/endatix-api/reporting/reporting";
import {
  groupTenantExportOptions,
  mapFormatsToTenantExportOptions,
} from "../map-tenant-export-options";

function format(
  overrides: Partial<ExportFormatListItem> &
    Pick<ExportFormatListItem, "id" | "name" | "wireKey" | "exportTarget">,
): ExportFormatListItem {
  return {
    deliveryFormat: "Csv",
    profile: "Native",
    label: overrides.name,
    settings: {
      aliasProfile: "native",
      keySeparator: "__",
      includeTestSubmissions: false,
    },
    createdAt: "2026-01-01T00:00:00Z",
    allowedFilters: [],
    ...overrides,
  };
}

describe("mapFormatsToTenantExportOptions", () => {
  it("maps formats using allowedFilters from the format DTO", () => {
    const options = mapFormatsToTenantExportOptions([
      format({
        id: "10",
        name: "Submissions CSV",
        exportTarget: "Submissions",
        wireKey: "csv",
        allowedFilters: ["includeTestSubmissions", "createdAtRange"],
      }),
      format({
        id: "11",
        name: "Shoji codebook",
        exportTarget: "Codebook",
        deliveryFormat: "Json",
        profile: "Shoji",
        wireKey: "codebook-shoji",
        label: "Shoji codebook",
        allowedFilters: ["locale"],
      }),
    ]);

    expect(options).toEqual([
      {
        exportFormatId: "10",
        exportTarget: "Submissions",
        profile: "Native",
        formatKey: "csv",
        label: "Submissions CSV",
        fallbackExtension: "csv",
        allowedFilters: ["includeTestSubmissions", "createdAtRange"],
      },
      {
        exportFormatId: "11",
        exportTarget: "Codebook",
        profile: "Shoji",
        formatKey: "codebook-shoji",
        label: "Shoji codebook",
        fallbackExtension: "json",
        allowedFilters: ["locale"],
      },
    ]);
  });

  it("keeps empty allowedFilters for native codebook", () => {
    const options = mapFormatsToTenantExportOptions([
      format({
        id: "12",
        name: "Codebook",
        exportTarget: "Codebook",
        deliveryFormat: "Json",
        profile: "Native",
        wireKey: "codebook",
        allowedFilters: [],
      }),
    ]);

    expect(options[0]?.allowedFilters).toEqual([]);
  });
});

describe("groupTenantExportOptions", () => {
  it("groups options by export target for the submissions dropdown", () => {
    const groups = groupTenantExportOptions([
      {
        exportFormatId: "10",
        exportTarget: "Submissions",
        profile: "Native",
        formatKey: "csv",
        label: "CSV",
        fallbackExtension: "csv",
        allowedFilters: ["includeTestSubmissions"],
      },
      {
        exportFormatId: "11",
        exportTarget: "Codebook",
        profile: "Native",
        formatKey: "codebook",
        label: "Codebook",
        fallbackExtension: "json",
        allowedFilters: [],
      },
      {
        exportFormatId: "12",
        exportTarget: "Submissions",
        profile: "Native",
        formatKey: "json",
        label: "JSON",
        fallbackExtension: "json",
        allowedFilters: ["includeTestSubmissions"],
      },
    ]);

    expect(groups).toEqual([
      {
        target: "Submissions",
        label: "Submissions",
        options: [
          {
            exportFormatId: "10",
            exportTarget: "Submissions",
            profile: "Native",
            formatKey: "csv",
            label: "CSV",
            fallbackExtension: "csv",
            allowedFilters: ["includeTestSubmissions"],
          },
          {
            exportFormatId: "12",
            exportTarget: "Submissions",
            profile: "Native",
            formatKey: "json",
            label: "JSON",
            fallbackExtension: "json",
            allowedFilters: ["includeTestSubmissions"],
          },
        ],
      },
      {
        target: "Codebook",
        label: "Codebook",
        options: [
          {
            exportFormatId: "11",
            exportTarget: "Codebook",
            profile: "Native",
            formatKey: "codebook",
            label: "Codebook",
            fallbackExtension: "json",
            allowedFilters: [],
          },
        ],
      },
    ]);
  });

  it("preserves unexpected targets after known order", () => {
    const groups = groupTenantExportOptions([
      {
        exportFormatId: "99",
        exportTarget: "Codebook",
        profile: "Shoji",
        formatKey: "codebook-shoji",
        label: "Shoji",
        fallbackExtension: "json",
        allowedFilters: [],
      },
      {
        exportFormatId: "10",
        exportTarget: "Submissions",
        profile: "Native",
        formatKey: "csv",
        label: "CSV",
        fallbackExtension: "csv",
        allowedFilters: ["includeTestSubmissions"],
      },
    ]);

    expect(groups.map((group) => group.target)).toEqual([
      "Submissions",
      "Codebook",
    ]);
  });
});
