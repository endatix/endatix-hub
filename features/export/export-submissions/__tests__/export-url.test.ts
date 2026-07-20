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

  it("attaches list filters for submission exports and strips them for codebook", () => {
    const listFilters = {
      includeTestSubmissions: false,
      createdAtFrom: "2026-01-01",
      createdAtTo: "2026-01-02",
      locale: "es",
    };

    const csvUrl = buildReportingExportUrl({
      formId: "100",
      wireKey: "csv",
      exportFormatId: "42",
      listFilters,
    });
    expect(csvUrl).toContain("includeTestSubmissions=false");
    expect(csvUrl).toContain("createdAfter=");
    expect(csvUrl).toContain("createdBefore=");
    expect(csvUrl).toContain("locale=es");

    const codebookUrl = buildReportingExportUrl({
      formId: "100",
      wireKey: "codebook-shoji",
      exportFormatId: "44",
      listFilters,
    });
    expect(codebookUrl).not.toContain("includeTestSubmissions");
    expect(codebookUrl).not.toContain("createdAfter");
    expect(codebookUrl).toContain("locale=es");
  });

  it("uses explicit includeTestSubmissions from the export dialog", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      wireKey: "csv",
      exportFormatId: "42",
      listFilters: {
        includeTestSubmissions: true,
      },
    });
    expect(url).toContain("includeTestSubmissions=true");
  });

  it("does not map grid test-only filter to includeTestSubmissions", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      wireKey: "csv",
      exportFormatId: "42",
      listFilters: {
        isTestSubmission: ["true"],
        createdAtFrom: "2026-01-01",
      },
    });
    expect(url).not.toContain("includeTestSubmissions");
    expect(url).toContain("createdAfter=");
  });

  it("attaches submissionIdRange filters for submission exports and strips them for codebook", () => {
    const listFilters = {
      minSubmissionId: "100",
      maxSubmissionId: "200",
    };

    const csvUrl = buildReportingExportUrl({
      formId: "100",
      wireKey: "csv",
      exportFormatId: "42",
      listFilters,
    });
    expect(csvUrl).toContain("minSubmissionId=100");
    expect(csvUrl).toContain("maxSubmissionId=200");

    const codebookUrl = buildReportingExportUrl({
      formId: "100",
      wireKey: "codebook-shoji",
      exportFormatId: "44",
      listFilters,
    });
    expect(codebookUrl).not.toContain("minSubmissionId");
    expect(codebookUrl).not.toContain("maxSubmissionId");
  });

  it("strips locale for native codebook but keeps it for Shoji codebook", () => {
    const listFilters = {
      locale: "es",
      includeTestSubmissions: false,
    };

    const native = buildReportingExportUrl({
      formId: "100",
      wireKey: "codebook",
      exportFormatId: "44",
      listFilters,
    });
    expect(native).not.toContain("locale=");
    expect(native).not.toContain("includeTestSubmissions");

    const shoji = buildReportingExportUrl({
      formId: "100",
      wireKey: "codebook-shoji",
      exportFormatId: "45",
      listFilters,
    });
    expect(shoji).toContain("locale=es");
    expect(shoji).not.toContain("includeTestSubmissions");
  });

  it("uses allowedFilters allow-list instead of wireKey fallback gating", () => {
    const listFilters = {
      includeTestSubmissions: true,
      createdAtFrom: "2026-01-01",
      locale: "es",
    };

    const url = buildReportingExportUrl({
      formId: "100",
      wireKey: "csv",
      exportFormatId: "42",
      listFilters,
      allowedFilters: ["locale"],
    });

    expect(url).toContain("locale=es");
    expect(url).not.toContain("includeTestSubmissions");
    expect(url).not.toContain("createdAfter=");
  });
});
