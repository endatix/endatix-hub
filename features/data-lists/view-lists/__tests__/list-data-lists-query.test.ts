import { describe, expect, it } from 'vitest';
import {
  ALL_LOCALES_FILTER_VALUE,
  buildDataListDetailHref,
  buildDataListsListHref,
  dataListsListHrefFromQuery,
  parseCalendarDateParam,
  parseDataListsListParams,
  parseDataListsReturnHref,
  parseDataListsReturnQuery,
  serializeDataListsListSearchParams,
} from '../utils';

describe("parseDataListsListParams", () => {
  it("maps Hub search to API search and normalizes locale", () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      page: '2',
      pageSize: '25',
      search: '  cities ',
      hasLocale: 'ES',
    });

    // Assert
    expect(parsed).toEqual({
      page: 2,
      pageSize: 25,
      search: "cities",
      hasLocale: "es",
      sortBy: undefined,
      sortDir: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      modifiedFrom: undefined,
      modifiedTo: undefined,
    });
  });

  it('normalizes comma-separated locale filters', () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      hasLocale: ' ES, de ,ES ',
    });

    // Assert
    expect(parsed.hasLocale).toBe('es,de');
  });

  it('drops the all-locales sentinel', () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      hasLocale: ALL_LOCALES_FILTER_VALUE,
    });

    // Assert
    expect(parsed.hasLocale).toBeUndefined();
  });

  it('parses sort and calendar date filters', () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      sortBy: 'name',
      sortDir: 'asc',
      createdFrom: '2024-01-15',
      createdTo: '2024-02-01',
      modifiedFrom: '2024-03-10',
      modifiedTo: '2024-03-20',
    });

    // Assert
    expect(parsed).toMatchObject({
      sortBy: 'name',
      sortDir: 'asc',
      createdFrom: '2024-01-15',
      createdTo: '2024-02-01',
      modifiedFrom: '2024-03-10',
      modifiedTo: '2024-03-20',
    });
  });

  it('drops invalid sort and date values', () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      sortBy: 'unknown',
      sortDir: 'sideways',
      createdFrom: '01-15-2024',
      createdTo: '2024-13-01',
    });

    // Assert
    expect(parsed.sortBy).toBeUndefined();
    expect(parsed.sortDir).toBeUndefined();
    expect(parsed.createdFrom).toBeUndefined();
    expect(parsed.createdTo).toBeUndefined();
  });
});

describe('parseCalendarDateParam', () => {
  it('accepts valid YYYY-MM-DD', () => {
    expect(parseCalendarDateParam('2024-06-01')).toBe('2024-06-01');
  });

  it('rejects non-calendar dates', () => {
    expect(parseCalendarDateParam('2024-02-30')).toBeUndefined();
  });
});

describe('serializeDataListsListSearchParams', () => {
  it('omits default paging and empty filters', () => {
    // Arrange & Act
    const query = serializeDataListsListSearchParams({
      page: 1,
      pageSize: 10,
    });

    // Assert
    expect(query).toBe('');
    expect(buildDataListsListHref({ page: 1, pageSize: 10 })).toBe(
      '/data-lists',
    );
  });
});

describe("buildDataListDetailHref", () => {
  it("builds a bare detail href with no query", () => {
    expect(buildDataListDetailHref("42")).toBe("/data-lists/42");
  });

  it("appends action when given", () => {
    expect(buildDataListDetailHref("42", { action: "replace" })).toBe(
      "/data-lists/42?action=replace",
    );
  });
});

describe("parseDataListsReturnQuery + dataListsListHrefFromQuery", () => {
  it("round-trips a remembered list query into a full href (BackToTableButton contract)", () => {
    const listQuery = serializeDataListsListSearchParams({
      page: 3,
      pageSize: 25,
      search: 'cities',
      hasLocale: 'es',
      sortBy: 'itemsCount',
      sortDir: 'desc',
      createdFrom: '2024-01-01',
      modifiedTo: '2024-12-31',
    });

    const parsed = parseDataListsReturnQuery(listQuery);
    const href = dataListsListHrefFromQuery(parsed);

    expect(href).toBe(`/data-lists?${listQuery}`);
  });

  it("drops unknown keys and re-clamps paging when re-parsing", () => {
    const parsed = parseDataListsReturnQuery(
      "page=-5&pageSize=1000&evil=<script>&search=cities",
    );

    expect(parsed).not.toContain("evil");
    expect(parsed).toContain("search=cities");
    expect(parsed).not.toContain("page=");
    expect(parsed).toContain("pageSize=1000");
  });

  it('round-trips list filters through the detail from param', () => {
    const listQuery = serializeDataListsListSearchParams({
      page: 3,
      pageSize: 25,
      search: 'cities',
      hasLocale: 'es',
      sortBy: 'itemsCount',
      sortDir: 'desc',
      createdFrom: '2024-01-01',
      modifiedTo: '2024-12-31',
    });

    const detailHref = buildDataListDetailHref('42', {
      listQuery,
      action: 'replace',
    });
    const from = new URLSearchParams(detailHref.split('?')[1] ?? '').get(
      'from',
    );

    expect(detailHref).toContain('action=replace');
    expect(parseDataListsReturnHref(from ?? undefined)).toBe(
      `/data-lists?${listQuery}`,
    );
  });
});
