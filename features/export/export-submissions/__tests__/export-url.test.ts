import { describe, expect, it } from "vitest";
import {
  buildLegacyExportUrl,
  buildReportingExportUrl,
} from "../../export-url";

describe("export url builders", () => {
  it("builds legacy export urls with optional exportId", () => {
    expect(buildLegacyExportUrl("100")).toBe("/api/forms/100/export");
    expect(buildLegacyExportUrl("100", "custom-1")).toBe(
      "/api/forms/100/export?exportId=custom-1",
    );
  });

  it("builds reporting export urls with format and exportFormatId", () => {
    expect(buildReportingExportUrl("100", "csv", "42")).toBe(
      "/api/forms/100/export?format=csv&exportFormatId=42",
    );
    expect(buildReportingExportUrl("100", "json", "43")).toBe(
      "/api/forms/100/export?format=json&exportFormatId=43",
    );
    expect(buildReportingExportUrl("100", "codebook-shoji", "44")).toBe(
      "/api/forms/100/export?format=codebook-shoji&exportFormatId=44",
    );
  });
});
