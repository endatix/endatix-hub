import { describe, expect, it } from "vitest";
import type { ExportCapabilityDto } from "@/lib/endatix-api/reporting/export-format-types";
import {
  getDefaultExportFormatSelection,
  getDeliveryFormatOptionsForTarget,
  getExportFormatTypeLabel,
  getExportTargetOptions,
  getProfileOptionsForSelection,
} from "@/lib/endatix-api/reporting/export-format-types";
import { normalizeExportCapabilities } from "@/lib/endatix-api/reporting/normalize-export-capabilities";

const CAPABILITIES: ExportCapabilityDto[] = [
  {
    target: "Submissions",
    deliveryFormat: "Csv",
    profile: "Native",
    wireKey: "csv",
    label: "CSV",
    itemTypeName: "Endatix.Core.Entities.SubmissionExportRow",
    description: "Tabular CSV export with one row per submission.",
    allowedFilters: [
      "includeTestSubmissions",
      "createdAtRange",
      "completedAtRange",
      "submissionIdRange",
      "locale",
      "columnScope",
    ],
  },
  {
    target: "Submissions",
    deliveryFormat: "Csv",
    profile: "Shoji",
    wireKey: "csv-shoji",
    label: "CSV (Shoji / Crunch)",
    itemTypeName: "Endatix.Core.Entities.SubmissionExportRow",
    description:
      "Crunch-compatible CSV: -- key separators and boolean category ids 0/1.",
    allowedFilters: [
      "includeTestSubmissions",
      "createdAtRange",
      "completedAtRange",
      "submissionIdRange",
      "locale",
      "columnScope",
    ],
  },
  {
    target: "Submissions",
    deliveryFormat: "Json",
    profile: "Native",
    wireKey: "json",
    label: "JSON",
    itemTypeName: "Endatix.Core.Entities.SubmissionExportRow",
    description: "Tabular JSON export with one object per submission.",
    allowedFilters: [
      "includeTestSubmissions",
      "createdAtRange",
      "completedAtRange",
      "submissionIdRange",
      "locale",
      "columnScope",
    ],
  },
  {
    target: "Codebook",
    deliveryFormat: "Json",
    profile: "Native",
    wireKey: "codebook",
    label: "Codebook",
    itemTypeName: "Endatix.Core.Entities.DynamicExportRow",
    description: "Standard Endatix codebook JSON for question metadata.",
    allowedFilters: [],
  },
  {
    target: "Codebook",
    deliveryFormat: "Json",
    profile: "Shoji",
    wireKey: "codebook-shoji",
    label: "Codebook (Shoji)",
    itemTypeName: "Endatix.Core.Entities.DynamicExportRow",
    description: "Shoji produces Crunch-compatible codebook JSON.",
    allowedFilters: ["locale"],
  },
];

describe("normalizeExportCapabilities", () => {
  it("maps numeric enum values from the API", () => {
    const normalized = normalizeExportCapabilities([
      {
        target: 1 as unknown as "Codebook",
        deliveryFormat: 1 as unknown as "Json",
        profile: 1 as unknown as "Shoji",
        wireKey: "codebook-shoji",
        label: "Codebook (Shoji)",
        itemTypeName: "Endatix.Core.Entities.DynamicExportRow",
      },
    ]);

    expect(normalized).toEqual([
      {
        target: "Codebook",
        deliveryFormat: "Json",
        profile: "Shoji",
        wireKey: "codebook-shoji",
        label: "Codebook (Shoji)",
        itemTypeName: "Endatix.Core.Entities.DynamicExportRow",
        description: "",
        allowedFilters: [],
      },
    ]);
  });
});

describe("capability-derived export options", () => {
  it("lists distinct targets from the capabilities catalog", () => {
    expect(getExportTargetOptions(CAPABILITIES)).toEqual([
      { value: "Submissions", label: "Submissions" },
      { value: "Codebook", label: "Codebook" },
    ]);
    expect(getExportTargetOptions([])).toEqual([]);
  });

  it("lists delivery formats for a target from capabilities only", () => {
    expect(
      getDeliveryFormatOptionsForTarget("Submissions", CAPABILITIES),
    ).toEqual([
      { value: "Csv", label: "CSV" },
      { value: "Json", label: "JSON" },
    ]);
    expect(getDeliveryFormatOptionsForTarget("Codebook", CAPABILITIES)).toEqual(
      [{ value: "Json", label: "JSON" }],
    );
    expect(getDeliveryFormatOptionsForTarget("Codebook", [])).toEqual([]);
  });

  it("lists profile options with API labels and descriptions", () => {
    expect(
      getProfileOptionsForSelection("Codebook", "Json", CAPABILITIES),
    ).toEqual([
      {
        value: "Native",
        label: "Codebook",
        description: "Standard Endatix codebook JSON for question metadata.",
      },
      {
        value: "Shoji",
        label: "Codebook (Shoji)",
        description: "Shoji produces Crunch-compatible codebook JSON.",
      },
    ]);
    expect(getProfileOptionsForSelection("Codebook", "Json", [])).toEqual([]);
  });

  it("defaults create selection from the first capability", () => {
    expect(getDefaultExportFormatSelection(CAPABILITIES)).toEqual({
      exportTarget: "Submissions",
      deliveryFormat: "Csv",
      profile: "Native",
    });
    expect(getDefaultExportFormatSelection([])).toBeNull();
  });

  it("uses capability label for format type display", () => {
    expect(
      getExportFormatTypeLabel(
        {
          id: "1",
          name: "My Shoji",
          exportTarget: "Codebook",
          deliveryFormat: "Json",
          profile: "Shoji",
          wireKey: "codebook-shoji",
          label: "Codebook (Shoji)",
          settings: {
            aliasProfile: "native",
            keySeparator: "--",
            includeTestSubmissions: false,
          },
          createdAt: "2026-01-01T00:00:00Z",
        },
        CAPABILITIES,
      ),
    ).toBe("Codebook (Shoji)");
  });
});
