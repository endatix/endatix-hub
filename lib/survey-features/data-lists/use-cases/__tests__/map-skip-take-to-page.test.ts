import { describe, expect, it } from "vitest";
import { mapSkipTakeToPage } from "../map-skip-take-to-page";

describe("mapSkipTakeToPage", () => {
  it("maps skip/take to 1-based Hub paging", () => {
    expect(mapSkipTakeToPage(0, 25)).toEqual({ page: 1, pageSize: 25 });
    expect(mapSkipTakeToPage(25, 25)).toEqual({ page: 2, pageSize: 25 });
  });

  it("falls back to the default page size when take is missing", () => {
    expect(mapSkipTakeToPage(0, 0)).toEqual({ page: 1, pageSize: 25 });
  });
});
