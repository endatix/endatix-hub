import { describe, expect, it } from "vitest";
import {
  sortingStateFromUrl,
  sortingUrlUpdatesFromState,
} from "../list-sorting";

describe("list-sorting", () => {
  it("returns empty sorting when sortBy is missing", () => {
    expect(sortingStateFromUrl(undefined, "desc")).toEqual([]);
  });

  it("treats missing sortDir as descending", () => {
    expect(sortingStateFromUrl("name", undefined)).toEqual([
      { id: "name", desc: true },
    ]);
  });

  it("maps asc sortDir to desc: false", () => {
    expect(sortingStateFromUrl("createdAt", "asc")).toEqual([
      { id: "createdAt", desc: false },
    ]);
  });

  it("clears sort URL keys when sorting is empty", () => {
    expect(sortingUrlUpdatesFromState([])).toEqual({
      sortBy: null,
      sortDir: null,
      page: "1",
    });
  });

  it("writes sortBy, sortDir, and page from the first sort", () => {
    expect(
      sortingUrlUpdatesFromState([{ id: "modifiedAt", desc: false }]),
    ).toEqual({
      sortBy: "modifiedAt",
      sortDir: "asc",
      page: "1",
    });
  });
});
