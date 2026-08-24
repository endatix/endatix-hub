import { describe, expect, it } from "vitest";
import {
  ALL_LOCALES_FILTER_VALUE,
  buildDataListDetailHref,
  buildDataListsListHref,
  parseDataListsListParams,
  parseDataListsReturnHref,
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

  it("round-trips list filters through the detail from param", () => {
    // Arrange
    const listQuery = serializeDataListsListSearchParams({
      page: 3,
      pageSize: 25,
      search: "cities",
      hasLocale: "es",
    });

    // Act
    const detailHref = buildDataListDetailHref("42", listQuery, {
      action: "replace",
    });
    const from = new URLSearchParams(detailHref.split("?")[1] ?? "").get(
      "from",
    );

    // Assert
    expect(detailHref).toContain("action=replace");
    expect(parseDataListsReturnHref(from ?? undefined)).toBe(
      `/data-lists?${listQuery}`,
    );
  });
});
