import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT_COMPLETION_STATUS,
  DEFAULT_REPORTING_LOCALE,
  EXPORT_COMPLETION_STATUS,
  EXPORT_REQUEST_FILTER,
} from "../../export-url";
import {
  createFilterDraftFromListFilters,
  hasFilterRangeErrors,
  pickDefaultExportFormatId,
  resolveDefaultLocale,
  showsCompletedAtFields,
  showsLocaleField,
  toSubmissionExportListFilters,
  validateFilterDraft,
} from "../export-dialog-filters";

describe("export-dialog-filters", () => {
  it("creates a draft from list filters with defaults", () => {
    const draft = createFilterDraftFromListFilters({
      createdAtFrom: "2026-01-01",
      completionStatus: EXPORT_COMPLETION_STATUS.all,
    });

    expect(draft.createdAt.from).toBe("2026-01-01");
    expect(draft.completionStatus).toBe(EXPORT_COMPLETION_STATUS.all);
    expect(draft.includeTestSubmissions).toBe(false);
    expect(draft.locale).toBe(DEFAULT_REPORTING_LOCALE);
  });

  it("defaults completion status for empty list filters", () => {
    expect(createFilterDraftFromListFilters().completionStatus).toBe(
      DEFAULT_EXPORT_COMPLETION_STATUS,
    );
  });

  it("validates inverted date ranges", () => {
    const draft = createFilterDraftFromListFilters({
      createdAtFrom: "2026-01-10",
      createdAtTo: "2026-01-01",
    });
    const errors = validateFilterDraft(draft, {
      showRowFilters: true,
      showCompletedAt: true,
    });

    expect(errors.createdAt).toContain("Created From");
    expect(hasFilterRangeErrors(errors)).toBe(true);
  });

  it("builds request filters from the draft", () => {
    const draft = createFilterDraftFromListFilters({
      includeTestSubmissions: true,
      completionStatus: EXPORT_COMPLETION_STATUS.completed,
      createdAtFrom: "2026-01-01",
      locale: "es",
    });

    expect(
      toSubmissionExportListFilters(draft, {
        showLocaleField: true,
        showRowFilters: true,
        showCompletedAt: true,
        locale: "es",
      }),
    ).toEqual({
      includeTestSubmissions: true,
      completionStatus: EXPORT_COMPLETION_STATUS.completed,
      createdAtFrom: "2026-01-01",
      createdAtTo: undefined,
      startedAtFrom: undefined,
      startedAtTo: undefined,
      completedAtFrom: undefined,
      completedAtTo: undefined,
      locale: "es",
    });
  });

  it("resolves default locale from form catalog", () => {
    expect(resolveDefaultLocale(["en", "es"], undefined)).toBe("en");
    expect(
      resolveDefaultLocale(["en", DEFAULT_REPORTING_LOCALE], undefined),
    ).toBe(DEFAULT_REPORTING_LOCALE);
    expect(resolveDefaultLocale(["en", "es"], "es")).toBe("es");
  });

  it("detects locale capability via shared filter constant", () => {
    expect(
      showsLocaleField({
        allowedFilters: [EXPORT_REQUEST_FILTER.locale],
      }),
    ).toBe(true);
    expect(showsLocaleField({ allowedFilters: [] })).toBe(false);
  });

  it("shows completed-at for completed and all only", () => {
    expect(showsCompletedAtFields(EXPORT_COMPLETION_STATUS.completed)).toBe(
      true,
    );
    expect(showsCompletedAtFields(EXPORT_COMPLETION_STATUS.all)).toBe(true);
    expect(showsCompletedAtFields(EXPORT_COMPLETION_STATUS.incomplete)).toBe(
      false,
    );
  });

  it("prefers a submissions format as default", () => {
    expect(
      pickDefaultExportFormatId([
        {
          exportFormatId: "cb",
          exportTarget: "Codebook",
          formatKey: "codebook",
        },
        {
          exportFormatId: "csv",
          exportTarget: "Submissions",
          formatKey: "csv",
        },
      ]),
    ).toBe("csv");
  });
});
