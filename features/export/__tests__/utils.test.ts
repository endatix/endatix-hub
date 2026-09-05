import { describe, expect, it } from "vitest";
import { FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { getExportDeliveryFormatIcon, getExportWireKeyIcon } from "../utils";

describe("export delivery icons", () => {
  it("maps delivery formats to File* icons", () => {
    expect(getExportDeliveryFormatIcon("Csv")).toBe(FileText);
    expect(getExportDeliveryFormatIcon("Json")).toBe(FileJson);
    expect(getExportDeliveryFormatIcon("Xlsx")).toBe(FileSpreadsheet);
  });

  it("maps reporting wire keys to File* icons", () => {
    expect(getExportWireKeyIcon("csv")).toBe(FileText);
    expect(getExportWireKeyIcon("csv-shoji")).toBe(FileText);
    expect(getExportWireKeyIcon("json")).toBe(FileJson);
    expect(getExportWireKeyIcon("codebook-shoji")).toBe(FileJson);
    expect(getExportWireKeyIcon("xlsx")).toBe(FileSpreadsheet);
  });
});
