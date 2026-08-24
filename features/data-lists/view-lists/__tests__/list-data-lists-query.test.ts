import { describe, expect, it } from "vitest";
import {
  ALL_LOCALES_FILTER_VALUE,
  buildDataListDetailHref,
  buildDataListsListHref,
  dataListsListHrefFromQuery,
  parseDataListsListParams,
  parseDataListsReturnQuery,
  serializeDataListsListSearchParams,
} from "../utils";

describe("parseDataListsListParams", () => {
  it("maps Hub search to API search and normalizes locale", () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      page: "2",
      pageSize: "25",
      search: "  cities ",
      hasLocale: "ES",
    });

    // Assert
    expect(parsed).toEqual({
      page: 2,
      pageSize: 25,
      search: "cities",
      hasLocale: "es",
    });
  });

  it("drops the all-locales sentinel", () => {
    // Arrange & Act
    const parsed = parseDataListsListParams({
      hasLocale: ALL_LOCALES_FILTER_VALUE,
    });

    // Assert
    expect(parsed.hasLocale).toBeUndefined();
  });
});

describe("serializeDataListsListSearchParams", () => {
  it("omits default paging and empty filters", () => {
    // Arrange & Act
    const query = serializeDataListsListSearchParams({
      page: 1,
      pageSize: 10,
    });

    // Assert
    expect(query).toBe("");
    expect(buildDataListsListHref({ page: 1, pageSize: 10 })).toBe(
      "/data-lists",
    );
  });
});

describe("buildDataListDetailHref", () => {
  it("builds a bare detail href with no query", () => {
    // Arrange & Act & Assert
    expect(buildDataListDetailHref("42")).toBe("/data-lists/42");
  });

  it("appends action when given", () => {
    // Arrange & Act & Assert
    expect(buildDataListDetailHref("42", { action: "replace" })).toBe(
      "/data-lists/42?action=replace",
    );
  });
});

describe("parseDataListsReturnQuery + dataListsListHrefFromQuery", () => {
  it("round-trips a remembered list query into a full href (BackToTableButton contract)", () => {
    // Arrange
    const listQuery = serializeDataListsListSearchParams({
      page: 3,
      pageSize: 25,
      search: "cities",
      hasLocale: "es",
    });

    // Act
    const parsed = parseDataListsReturnQuery(listQuery);
    const href = dataListsListHrefFromQuery(parsed);

    // Assert
    expect(href).toBe(`/data-lists?${listQuery}`);
  });

  it("drops unknown keys and re-clamps paging when re-parsing", () => {
    // Arrange & Act
    const parsed = parseDataListsReturnQuery(
      "page=-5&pageSize=1000&evil=<script>&search=cities",
    );

    // Assert
    expect(parsed).not.toContain("evil");
    expect(parsed).toContain("search=cities");
    expect(parsed).not.toContain("page=");
    expect(parsed).toContain("pageSize=1000");
  });
});
