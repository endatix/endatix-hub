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
    ...overrides,
  };
}

describe("mapFormatsToTenantExportOptions", () => {
  it("maps tenant formats to dropdown options with fallback extensions", () => {
    const options = mapFormatsToTenantExportOptions([
      format({
        id: "10",
        name: "Submissions CSV",
        wireKey: "csv",
        exportTarget: "Submissions",
      }),
      format({
        id: "11",
        name: "Shoji codebook",
        wireKey: "codebook-shoji",
        exportTarget: "Codebook",
        deliveryFormat: "Json",
        profile: "Shoji",
      }),
    ]);

    expect(options).toEqual([
      {
        exportFormatId: "10",
        exportTarget: "Submissions",
        wireKey: "csv",
        label: "Submissions CSV",
        fallbackExtension: "csv",
      },
      {
        exportFormatId: "11",
        exportTarget: "Codebook",
        wireKey: "codebook-shoji",
        label: "Shoji codebook",
        fallbackExtension: "json",
      },
    ]);
  });
});

describe("groupTenantExportOptions", () => {
  it("groups options by export target for the submissions dropdown", () => {
    const groups = groupTenantExportOptions([
      {
        exportFormatId: "10",
        exportTarget: "Submissions",
        wireKey: "csv",
        label: "CSV",
        fallbackExtension: "csv",
      },
      {
        exportFormatId: "11",
        exportTarget: "Codebook",
        wireKey: "codebook",
        label: "Codebook",
        fallbackExtension: "json",
      },
      {
        exportFormatId: "12",
        exportTarget: "Submissions",
        wireKey: "json",
        label: "JSON",
        fallbackExtension: "json",
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
            wireKey: "csv",
            label: "CSV",
            fallbackExtension: "csv",
          },
          {
            exportFormatId: "12",
            exportTarget: "Submissions",
            wireKey: "json",
            label: "JSON",
            fallbackExtension: "json",
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
            wireKey: "codebook",
            label: "Codebook",
            fallbackExtension: "json",
          },
        ],
      },
    ]);
  });

  it("keeps Submissions before Codebook regardless of input order", () => {
    const groups = groupTenantExportOptions([
      {
        exportFormatId: "11",
        exportTarget: "Codebook",
        wireKey: "codebook",
        label: "Codebook",
        fallbackExtension: "json",
      },
      {
        exportFormatId: "10",
        exportTarget: "Submissions",
        wireKey: "csv",
        label: "CSV",
        fallbackExtension: "csv",
      },
    ]);

    expect(groups.map((group) => group.target)).toEqual([
      "Submissions",
      "Codebook",
    ]);
  });
});
