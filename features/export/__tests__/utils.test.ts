import { describe, expect, it } from "vitest";
import {
  getExportDeliveryFileKind,
  getExportFormatFileKind,
  getExportWireKeyFileKind,
} from "../utils";

describe("export file kind resolvers", () => {
  it("maps delivery formats to file kinds", () => {
    // Act & Assert
    expect(getExportDeliveryFileKind("Csv")).toBe("csv");
    expect(getExportDeliveryFileKind("Json")).toBe("json");
    expect(getExportDeliveryFileKind("Xlsx")).toBe("xlsx");
  });

  it("maps reporting wire keys to file kinds", () => {
    // Act & Assert
    expect(getExportWireKeyFileKind("csv")).toBe("csv");
    expect(getExportWireKeyFileKind("csv-shoji")).toBe("csv");
    expect(getExportWireKeyFileKind("json")).toBe("json");
    expect(getExportWireKeyFileKind("codebook-shoji")).toBe("json");
    expect(getExportWireKeyFileKind("xlsx")).toBe("xlsx");
  });

  it("returns undefined for an unknown wire key rather than guessing", () => {
    // Act & Assert
    expect(getExportWireKeyFileKind("parquet")).toBeUndefined();
    expect(getExportWireKeyFileKind("")).toBeUndefined();
  });

  it("falls back to the delivery enum when the wire key is newer than this build", () => {
    // Act & Assert
    expect(
      getExportFormatFileKind({
        wireKey: "xlsx-shoji",
        deliveryFormat: "Xlsx",
      }),
    ).toBe("xlsx");
    expect(
      getExportFormatFileKind({ wireKey: "csv-shoji", deliveryFormat: "Csv" }),
    ).toBe("csv");
  });
});
