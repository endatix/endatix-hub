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

  it("sends sort and calendar date bounds", () => {
    const endpoint = buildListDataListsEndpoint({
      sortBy: "name",
      sortDir: "asc",
      createdFrom: "2024-01-01",
      createdTo: "2024-01-31",
      modifiedFrom: "2024-02-01",
      modifiedTo: "2024-02-28",
    });

    expect(endpoint).toContain("sortBy=name");
    expect(endpoint).toContain("sortDir=asc");
    expect(endpoint).toContain("createdFrom=2024-01-01");
    expect(endpoint).toContain("createdTo=2024-01-31");
    expect(endpoint).toContain("modifiedFrom=2024-02-01");
    expect(endpoint).toContain("modifiedTo=2024-02-28");
  });

  it("omits empty search and hasLocale", () => {
    // Arrange & Act
    const endpoint = buildListDataListsEndpoint({});

    // Assert
    expect(endpoint).toBe("/data-lists?page=1&pageSize=10");
  });
});
