import { describe, expect, it } from "vitest";
import { parseDataListItemsParams } from "../utils";

describe("parseDataListItemsParams", () => {
  it("maps Hub search to API query with default page size 25", () => {
    // Arrange & Act
    const parsed = parseDataListItemsParams({
      search: "  york ",
      page: "2",
    });

    // Assert
    expect(parsed).toEqual({
      page: 2,
      pageSize: 25,
      query: "york",
    });
  });
});
