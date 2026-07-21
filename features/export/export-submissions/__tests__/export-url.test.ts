import { describe, expect, it } from "vitest";
import {
  buildLegacyExportUrl,
  buildReportingExportUrl,
  mapIncludeTestSubmissions,
} from "../../export-url";
import {
  utcCalendarDayStartIso,
  utcCalendarNextDayStartIso,
} from "@/lib/endatix-api/submissions/submission-list-query-params";

const SUBMISSIONS_FILTERS = [
  "includeTestSubmissions",
  "createdAtRange",
  "completedAtRange",
  "submissionIdRange",
  "completionStatus",
] as const;

describe("mapIncludeTestSubmissions", () => {
  it("maps production-only grid filter to false", () => {
    expect(mapIncludeTestSubmissions(["false"])).toBe(false);
  });

  it("returns undefined for empty, test-only, or both (no test-only API mode)", () => {
    expect(mapIncludeTestSubmissions(undefined)).toBeUndefined();
    expect(mapIncludeTestSubmissions([])).toBeUndefined();
    expect(mapIncludeTestSubmissions(["true"])).toBeUndefined();
    expect(mapIncludeTestSubmissions(["true", "false"])).toBeUndefined();
  });
});

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

  it("attaches only filters present on the format allow-list", () => {
    const listFilters = {
      includeTestSubmissions: false,
      completionStatus: "completed" as const,
      createdAtFrom: "2026-01-01",
      createdAtTo: "2026-01-02",
      locale: "es",
    };

    const csvUrl = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters,
      allowedFilters: [...SUBMISSIONS_FILTERS],
    });
    expect(csvUrl).toContain("includeTestSubmissions=false");
    expect(csvUrl).toContain("completionStatus=completed");
    expect(csvUrl).toContain("createdAfter=");
    expect(csvUrl).toContain("createdBefore=");
    expect(csvUrl).not.toContain("locale=es");

    const codebookUrl = buildReportingExportUrl({
      formId: "100",
      formatKey: "codebook-shoji",
      exportFormatId: "44",
      listFilters,
      allowedFilters: ["locale"],
    });
    expect(codebookUrl).not.toContain("includeTestSubmissions");
    expect(codebookUrl).not.toContain("completionStatus");
    expect(codebookUrl).not.toContain("createdAfter");
    expect(codebookUrl).toContain("locale=es");
  });

  it("uses explicit includeTestSubmissions from the export dialog", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        includeTestSubmissions: true,
      },
      allowedFilters: ["includeTestSubmissions"],
    });
    expect(url).toContain("includeTestSubmissions=true");
  });

  it("does not map grid test-only filter to includeTestSubmissions", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        isTestSubmission: ["true"],
        createdAtFrom: "2026-01-01",
      },
      allowedFilters: ["includeTestSubmissions", "createdAtRange"],
    });
    expect(url).not.toContain("includeTestSubmissions");
    expect(url).toContain("createdAfter=");
  });

  it("maps production-only grid filter to includeTestSubmissions=false", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        isTestSubmission: ["false"],
      },
      allowedFilters: ["includeTestSubmissions"],
    });
    expect(url).toContain("includeTestSubmissions=false");
  });

  it("prefers explicit includeTestSubmissions over grid isTestSubmission", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        isTestSubmission: ["false"],
        includeTestSubmissions: true,
      },
      allowedFilters: ["includeTestSubmissions"],
    });
    expect(url).toContain("includeTestSubmissions=true");
  });

  it("encodes calendar ranges with inclusive from and exclusive next-day to", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        createdAtFrom: "2026-01-01",
        createdAtTo: "2026-01-02",
        completedAtFrom: "2026-02-01",
        completedAtTo: "2026-02-03",
      },
      allowedFilters: ["createdAtRange", "completedAtRange"],
    });
    const params = new URL(url, "https://example.test").searchParams;

    expect(params.get("createdAfter")).toBe(
      utcCalendarDayStartIso("2026-01-01"),
    );
    expect(params.get("createdBefore")).toBe(
      utcCalendarNextDayStartIso("2026-01-02"),
    );
    expect(params.get("completedAfter")).toBe(
      utcCalendarDayStartIso("2026-02-01"),
    );
    expect(params.get("completedBefore")).toBe(
      utcCalendarNextDayStartIso("2026-02-03"),
    );
  });

  it("skips invalid calendar dates", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        createdAtFrom: "not-a-date",
        createdAtTo: "2026-13-40",
        completedAtFrom: "2026-01-01",
      },
      allowedFilters: ["createdAtRange", "completedAtRange"],
    });

    expect(url).not.toContain("createdAfter=");
    expect(url).not.toContain("createdBefore=");
    expect(url).toContain("completedAfter=");
  });

  it("attaches completionStatus values when allowed", () => {
    for (const status of ["all", "completed", "incomplete"] as const) {
      const url = buildReportingExportUrl({
        formId: "100",
        formatKey: "csv",
        exportFormatId: "42",
        listFilters: { completionStatus: status },
        allowedFilters: ["completionStatus"],
      });
      expect(url).toContain(`completionStatus=${status}`);
    }
  });

  it("trims locale and omits blank locale", () => {
    const withLocale = buildReportingExportUrl({
      formId: "100",
      formatKey: "codebook-shoji",
      exportFormatId: "44",
      listFilters: { locale: "  es  " },
      allowedFilters: ["locale"],
    });
    expect(withLocale).toContain("locale=es");

    const blankLocale = buildReportingExportUrl({
      formId: "100",
      formatKey: "codebook-shoji",
      exportFormatId: "44",
      listFilters: { locale: "   " },
      allowedFilters: ["locale"],
    });
    expect(blankLocale).not.toContain("locale=");
  });

  it("attaches submissionIdRange filters for submission exports and strips them for codebook", () => {
    const listFilters = {
      minSubmissionId: "100",
      maxSubmissionId: "200",
    };

    const csvUrl = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters,
      allowedFilters: [...SUBMISSIONS_FILTERS],
    });
    expect(csvUrl).toContain("minSubmissionId=100");
    expect(csvUrl).toContain("maxSubmissionId=200");

    const codebookUrl = buildReportingExportUrl({
      formId: "100",
      formatKey: "codebook-shoji",
      exportFormatId: "44",
      listFilters,
      allowedFilters: ["locale"],
    });
    expect(codebookUrl).not.toContain("minSubmissionId");
    expect(codebookUrl).not.toContain("maxSubmissionId");
  });

  it("omits all list filters when allowedFilters is empty", () => {
    const listFilters = {
      locale: "es",
      includeTestSubmissions: false,
    };

    const native = buildReportingExportUrl({
      formId: "100",
      formatKey: "codebook",
      exportFormatId: "44",
      listFilters,
      allowedFilters: [],
    });
    expect(native).not.toContain("locale=");
    expect(native).not.toContain("includeTestSubmissions");

    const shoji = buildReportingExportUrl({
      formId: "100",
      formatKey: "codebook-shoji",
      exportFormatId: "45",
      listFilters,
      allowedFilters: ["locale"],
    });
    expect(shoji).toContain("locale=es");
    expect(shoji).not.toContain("includeTestSubmissions");
  });

  it("does not attach filters when allowedFilters is omitted", () => {
    const url = buildReportingExportUrl({
      formId: "100",
      formatKey: "csv",
      exportFormatId: "42",
      listFilters: {
        includeTestSubmissions: true,
        locale: "es",
      },
    });

    expect(url).not.toContain("includeTestSubmissions");
    expect(url).not.toContain("locale=");
  });
});
