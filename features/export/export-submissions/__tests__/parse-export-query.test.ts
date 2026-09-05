import { describe, expect, it } from "vitest";
import {
  parseLegacyExportFormat,
  parseReportingExportFormat,
} from "../parse-export-query";

describe("parseReportingExportFormat", () => {
  it("accepts xlsx and other catalog wire keys", () => {
    // Act & Assert
    expect(parseReportingExportFormat("xlsx")).toBe("xlsx");
    expect(parseReportingExportFormat("csv-shoji")).toBe("csv-shoji");
    expect(parseReportingExportFormat("codebook")).toBe("codebook");
  });

  it("rejects unknown keys", () => {
    // Act & Assert
    expect(parseReportingExportFormat("pdf")).toBeUndefined();
    expect(parseReportingExportFormat(null)).toBeUndefined();
  });
});

describe("parseLegacyExportFormat", () => {
  it("accepts physical file kinds only", () => {
    // Act & Assert
    expect(parseLegacyExportFormat("csv")).toBe("csv");
    expect(parseLegacyExportFormat("xlsx")).toBe("xlsx");
    expect(parseLegacyExportFormat("json")).toBe("json");
    expect(parseLegacyExportFormat("pdf")).toBeUndefined();
    expect(parseLegacyExportFormat("codebook")).toBeUndefined();
  });
});
