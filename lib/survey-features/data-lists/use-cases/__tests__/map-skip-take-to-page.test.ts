import { describe, expect, it } from "vitest";
import { mapSkipTakeToPage } from "../map-skip-take-to-page";

describe("mapSkipTakeToPage", () => {
  it("maps skip/take to 1-based Hub paging", () => {
    expect(mapSkipTakeToPage(0, 25)).toEqual({ page: 1, pageSize: 25 });
    expect(mapSkipTakeToPage(25, 25)).toEqual({ page: 2, pageSize: 25 });
  });

  it("uses the default page size when take is not positive", () => {
    expect(mapSkipTakeToPage(0, 0)).toEqual({ page: 1, pageSize: 25 });
  });

  it("clamps negative skip to page 1", () => {
    expect(mapSkipTakeToPage(-10, 25)).toEqual({ page: 1, pageSize: 25 });
  });
});
