import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT_COMPLETION_STATUS,
  DEFAULT_REPORTING_LOCALE,
  EXPORT_COMPLETION_STATUS,
  EXPORT_REQUEST_FILTER,
} from "../../export-url";
import {
  completionStatusFromIsCompleteFilter,
  createFilterDraftFromListFilters,
  hasFilterRangeErrors,
  includeTestSubmissionsFromGridFilter,
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
      createdFrom: "2026-01-01",
      completionStatus: EXPORT_COMPLETION_STATUS.all,
    });

    expect(draft.createdAt.from).toBe("2026-01-01");
    expect(draft.completionStatus).toBe(EXPORT_COMPLETION_STATUS.all);
    expect(draft.includeTestSubmissions).toBe(false);
    expect(draft.locale).toBe(DEFAULT_REPORTING_LOCALE);
    expect(draft.statusFilterWiderThanList).toBe(false);
  });

  it("carries the list's wider-than-list flag into the draft, never into the request", () => {
    // Act
    const draft = createFilterDraftFromListFilters({
      completionStatus: EXPORT_COMPLETION_STATUS.incomplete,
      statusFilterWiderThanList: true,
    });
    const request = toSubmissionExportListFilters(draft, {
      showLocaleField: false,
      showRowFilters: true,
      showCompletedAt: false,
      locale: DEFAULT_REPORTING_LOCALE,
    });

    // Assert
    expect(draft.statusFilterWiderThanList).toBe(true);
    expect(request).not.toHaveProperty("statusFilterWiderThanList");
  });

  it("maps the grid complete and test filters", () => {
    expect(completionStatusFromIsCompleteFilter([])).toBe(
      EXPORT_COMPLETION_STATUS.all,
    );
    expect(completionStatusFromIsCompleteFilter(["true"])).toBe(
      EXPORT_COMPLETION_STATUS.completed,
    );
    expect(completionStatusFromIsCompleteFilter(["false"])).toBe(
      EXPORT_COMPLETION_STATUS.incomplete,
    );
    expect(completionStatusFromIsCompleteFilter(["true", "false"])).toBe(
      EXPORT_COMPLETION_STATUS.all,
    );

    expect(includeTestSubmissionsFromGridFilter([])).toBe(true);
    expect(includeTestSubmissionsFromGridFilter(["false"])).toBe(false);
    expect(includeTestSubmissionsFromGridFilter(["true"])).toBe(true);
    expect(includeTestSubmissionsFromGridFilter(["true", "false"])).toBe(true);
  });

  it("defaults completion status for empty list filters", () => {
    expect(createFilterDraftFromListFilters().completionStatus).toBe(
      DEFAULT_EXPORT_COMPLETION_STATUS,
    );
  });

  it("validates inverted date ranges", () => {
    const draft = createFilterDraftFromListFilters({
      createdFrom: "2026-01-10",
      createdTo: "2026-01-01",
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
      createdFrom: "2026-01-01",
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
      createdFrom: "2026-01-01",
      createdTo: undefined,
      modifiedFrom: undefined,
      modifiedTo: undefined,
      startedFrom: undefined,
      startedTo: undefined,
      completedFrom: undefined,
      completedTo: undefined,
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
