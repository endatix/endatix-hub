import { describe, expect, it } from "vitest";
import {
  DEFAULT_REPORTING_LOCALE,
  EXPORT_REQUEST_FILTER,
} from "../../export-url";
import {
  createFilterDraftFromListFilters,
  rowFiltersMatch,
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
      collectionStatus: ["in_progress"],
    });

    expect(draft.createdAt.from).toBe("2026-01-01");
    expect(draft.collectionStatus).toEqual(["in_progress"]);
    expect(draft.includeTestSubmissions).toBe(false);
    expect(draft.locale).toBe(DEFAULT_REPORTING_LOCALE);
  });

  it("maps the grid test filter", () => {
    expect(includeTestSubmissionsFromGridFilter([])).toBe(true);
    expect(includeTestSubmissionsFromGridFilter(["false"])).toBe(false);
    expect(includeTestSubmissionsFromGridFilter(["true"])).toBe(true);
    expect(includeTestSubmissionsFromGridFilter(["true", "false"])).toBe(true);
  });

  it("defaults to every status when the list has no status filter", () => {
    expect(createFilterDraftFromListFilters().collectionStatus).toEqual([]);
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
      collectionStatus: ["complete"],
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
      collectionStatus: ["complete"],
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

  it("shows completed-at unless every selected code is not complete", () => {
    expect(showsCompletedAtFields([])).toBe(true);
    expect(showsCompletedAtFields(["complete"])).toBe(true);
    expect(showsCompletedAtFields(["in_progress"])).toBe(false);
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

  describe("rowFiltersMatch", () => {
    const table = createFilterDraftFromListFilters({
      collectionStatus: ["viewed", "not_started"],
      createdFrom: "2026-01-01",
      completedFrom: "2026-02-01",
    });

    it("matches the same codes in any order", () => {
      const draft = { ...table, collectionStatus: ["not_started", "viewed"] };

      expect(rowFiltersMatch(draft, table, { includeCompletedAt: true })).toBe(
        true,
      );
    });

    it("differs on status, test toggle or a shown date", () => {
      const options = { includeCompletedAt: true };

      expect(
        rowFiltersMatch(
          { ...table, collectionStatus: ["viewed"] },
          table,
          options,
        ),
      ).toBe(false);
      expect(
        rowFiltersMatch(
          { ...table, includeTestSubmissions: true },
          table,
          options,
        ),
      ).toBe(false);
      expect(
        rowFiltersMatch(
          { ...table, createdAt: { from: "2026-01-02", to: "" } },
          table,
          options,
        ),
      ).toBe(false);
    });

    it("ignores Completed at while it is hidden", () => {
      const cleared = { ...table, completedAt: { from: "", to: "" } };

      expect(
        rowFiltersMatch(cleared, table, { includeCompletedAt: false }),
      ).toBe(true);
      expect(
        rowFiltersMatch(cleared, table, { includeCompletedAt: true }),
      ).toBe(false);
    });
  });
});
