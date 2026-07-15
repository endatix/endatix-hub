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

  it("builds reporting export urls with format query param", () => {
    expect(buildReportingExportUrl("100", "csv")).toBe(
      "/api/forms/100/export?format=csv",
    );
    expect(buildReportingExportUrl("100", "json")).toBe(
      "/api/forms/100/export?format=json",
    );
    expect(buildReportingExportUrl("100", "codebook-shoji")).toBe(
      "/api/forms/100/export?format=codebook-shoji",
    );
  });
});
