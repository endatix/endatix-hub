import { describe, expect, it } from "vitest";
import {
  getExportFormatFallbackExtension,
  getReportingExportWire,
  isBuiltInExportFileKind,
  isCodebookFormatKey,
  isReportingExportWireKey,
} from "../reporting-export-wire";

describe("REPORTING_EXPORT_WIRE", () => {
  it("maps wire keys to file kinds", () => {
    // Act & Assert
    expect(getReportingExportWire("csv")?.fileKind).toBe("csv");
    expect(getReportingExportWire("csv-shoji")?.fileKind).toBe("csv");
    expect(getReportingExportWire("xlsx")?.fileKind).toBe("xlsx");
    expect(getReportingExportWire("codebook")?.fileKind).toBe("json");
    expect(getReportingExportWire("codebook-shoji")?.fileKind).toBe("json");
  });

  it("flags codebook wires only", () => {
    // Act & Assert
    expect(isCodebookFormatKey("codebook")).toBe(true);
    expect(isCodebookFormatKey("codebook-shoji")).toBe(true);
    expect(isCodebookFormatKey("csv")).toBe(false);
    expect(isCodebookFormatKey("xlsx")).toBe(false);
    expect(isCodebookFormatKey("unknown")).toBe(false);
  });

  it("resolves fallback file extensions from file kind", () => {
    // Act & Assert
    expect(getExportFormatFallbackExtension("codebook")).toBe("json");
    expect(getExportFormatFallbackExtension("csv-shoji")).toBe("csv");
    expect(getExportFormatFallbackExtension("xlsx")).toBe("xlsx");
    expect(getExportFormatFallbackExtension("pdf")).toBe("pdf");
  });

  it("accepts xlsx as a reporting wire key", () => {
    // Act & Assert
    expect(isReportingExportWireKey("xlsx")).toBe(true);
  });

  it("limits built-in download kinds to csv, xlsx, and json", () => {
    // Act & Assert
    expect(isBuiltInExportFileKind("xlsx")).toBe(true);
    expect(isBuiltInExportFileKind("pdf")).toBe(false);
    expect(isBuiltInExportFileKind("codebook")).toBe(false);
  });
});
