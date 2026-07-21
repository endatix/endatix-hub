import { describe, expect, it } from "vitest";
import type { ColumnAliasNamingConventionDto } from "@/lib/endatix-api/reporting/export-format-types";
import {
  buildExportFormatSettingsInput,
  getColumnAliasProfileLabel,
  getExportFormatSettingsSummary,
} from "@/lib/endatix-api/reporting/export-format-types";
import { normalizeExportFormats } from "@/lib/endatix-api/reporting/normalize-export-formats";

const NAMING_CONVENTIONS: ColumnAliasNamingConventionDto[] = [
  {
    wireKey: "native",
    label: "Survey keys",
    description: "Use canonical column keys from the compiled form schema.",
    example: "question__choice",
  },
  {
    wireKey: "crunch",
    label: "Question index",
    description:
      "Sequential Q1, Q1_1, Q2-style headers grouped by source question.",
    example: "Q1, Q1_1, Q2",
  },
];

describe("normalizeExportFormats", () => {
  it("maps numeric aliasProfile values from the API", () => {
    const normalized = normalizeExportFormats([
      {
        id: "1",
        name: "CSV",
        exportTarget: "Submissions",
        deliveryFormat: "Csv",
        profile: "Native",
        wireKey: "csv",
        label: "CSV",
        settings: {
          aliasProfile: 0 as unknown as "native",
          keySeparator: "__",
          includeTestSubmissions: false,
        },
        createdAt: "2026-01-01T00:00:00Z",
        allowedFilters: [],
      },
    ]);

    expect(normalized[0]?.settings.aliasProfile).toBe("native");
  });

  it("preserves unknown string aliasProfile wire keys", () => {
    const normalized = normalizeExportFormats([
      {
        id: "1",
        name: "CSV",
        exportTarget: "Submissions",
        deliveryFormat: "Csv",
        profile: "Native",
        wireKey: "csv",
        label: "CSV",
        settings: {
          aliasProfile: "spss",
          keySeparator: "__",
          includeTestSubmissions: false,
        },
        createdAt: "2026-01-01T00:00:00Z",
        allowedFilters: [],
      },
    ]);

    expect(normalized[0]?.settings.aliasProfile).toBe("spss");
  });

  it("normalizes missing allowedFilters to an empty array", () => {
    const normalized = normalizeExportFormats([
      {
        id: "1",
        name: "CSV",
        exportTarget: "Submissions",
        deliveryFormat: "Csv",
        profile: "Native",
        wireKey: "csv",
        label: "CSV",
        settings: {
          aliasProfile: "native",
          keySeparator: "__",
          includeTestSubmissions: false,
        },
        createdAt: "2026-01-01T00:00:00Z",
        allowedFilters: undefined as unknown as string[],
      },
    ]);

    expect(normalized[0]?.allowedFilters).toEqual([]);
  });

  it("preserves allowedFilters from the API", () => {
    const normalized = normalizeExportFormats([
      {
        id: "1",
        name: "Shoji codebook",
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
        allowedFilters: ["locale"],
      },
    ]);

    expect(normalized[0]?.allowedFilters).toEqual(["locale"]);
  });

  it("drops request-time-only settings fields from the hub model", () => {
    const normalized = normalizeExportFormats([
      {
        id: "1",
        name: "CSV",
        exportTarget: "Submissions",
        deliveryFormat: "Csv",
        profile: "Native",
        wireKey: "csv",
        label: "CSV",
        settings: {
          aliasProfile: "native",
          keySeparator: "__",
          includeTestSubmissions: true,
          locale: "en",
          columnScope: ["q1"],
        } as unknown as {
          aliasProfile: "native";
          keySeparator: string;
          includeTestSubmissions: boolean;
        },
        createdAt: "2026-01-01T00:00:00Z",
        allowedFilters: [],
      },
    ]);

    expect(normalized[0]?.settings).toEqual({
      aliasProfile: "native",
      keySeparator: "__",
      includeTestSubmissions: true,
    });
  });
});

describe("buildExportFormatSettingsInput", () => {
  it("includes naming for codebook and omits includeTestSubmissions", () => {
    expect(
      buildExportFormatSettingsInput("Codebook", "Native", {
        aliasProfile: "native",
        keySeparator: "__",
        includeTestSubmissions: true,
      }),
    ).toEqual({
      aliasProfile: "native",
      keySeparator: "__",
    });
  });

  it("includes key separator for shoji codebook exports", () => {
    expect(
      buildExportFormatSettingsInput("Codebook", "Shoji", {
        aliasProfile: "native",
        keySeparator: "--",
      }),
    ).toEqual({
      aliasProfile: "native",
      keySeparator: "--",
    });
  });

  it("only sends persisted settings fields", () => {
    expect(
      buildExportFormatSettingsInput("Submissions", "Native", {
        aliasProfile: "crunch",
        keySeparator: "__",
        includeTestSubmissions: true,
      }),
    ).toEqual({
      aliasProfile: "crunch",
      keySeparator: "__",
      includeTestSubmissions: true,
    });
  });
});

describe("export format display helpers", () => {
  it("labels column naming from the naming conventions catalog", () => {
    expect(getColumnAliasProfileLabel("native", NAMING_CONVENTIONS)).toBe(
      "Survey keys",
    );
    expect(getColumnAliasProfileLabel("crunch", NAMING_CONVENTIONS)).toBe(
      "Question index",
    );
    expect(getColumnAliasProfileLabel("crunch")).toBe("crunch");
  });

  it("summarizes naming without locale", () => {
    expect(
      getExportFormatSettingsSummary(
        {
          id: "4",
          name: "Shoji",
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
          allowedFilters: ["locale"],
        },
        NAMING_CONVENTIONS,
      ),
    ).toBe("Survey keys · --");
  });
});
