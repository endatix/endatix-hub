import { describe, expect, it } from "vitest";
import {
  parseCollectionStatusQuery,
  parseLegacyExportFormat,
  parseReportingExportFormat,
  parseSubmissionRowExportQuery,
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

describe("parseCollectionStatusQuery", () => {
  it("joins valid codes and drops junk", () => {
    // Act & Assert
    expect(parseCollectionStatusQuery("in_progress|complete")).toBe(
      "in_progress|complete",
    );
    expect(parseCollectionStatusQuery(" Complete | bogus! |viewed ")).toBe(
      "complete|viewed",
    );
    expect(parseCollectionStatusQuery("")).toBeUndefined();
    expect(parseCollectionStatusQuery(null)).toBeUndefined();
  });
});

describe("parseSubmissionRowExportQuery", () => {
  it("reads collectionStatus from the query string", () => {
    // Arrange
    const params = new URLSearchParams(
      "collectionStatus=in_progress|expired&completionStatus=completed",
    );

    // Act
    const parsed = parseSubmissionRowExportQuery(params);

    // Assert
    expect(parsed.collectionStatus).toBe("in_progress|expired");
    expect(parsed.completionStatus).toBe("completed");
  });
});
