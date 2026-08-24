import { describe, expect, it } from "vitest";
import { buildListDataListsEndpoint } from "../data-lists";

describe("buildListDataListsEndpoint", () => {
  it("sends search, not query, for the management list", () => {
    // Arrange & Act
    const endpoint = buildListDataListsEndpoint({
      page: 2,
      pageSize: 25,
      search: "cities",
      hasLocale: "es",
    });

    // Assert
    expect(endpoint).toBe(
      "/data-lists?page=2&pageSize=25&search=cities&hasLocale=es",
    );
    expect(endpoint).not.toContain("query=");
  });

  it("omits empty search and hasLocale", () => {
    // Arrange & Act
    const endpoint = buildListDataListsEndpoint({});

    // Assert
    expect(endpoint).toBe("/data-lists?page=1&pageSize=10");
  });
});
