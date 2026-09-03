import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useListTableState } from "../use-list-table-state";

describe("useListTableState", () => {
  it("derives sorting and both date filters from the URL state", () => {
    const { result } = renderHook(() =>
      useListTableState(
        {
          sortBy: "createdAt",
          sortDir: "asc",
          createdFrom: "2026-01-01",
          createdTo: "2026-01-31",
          modifiedFrom: "2026-02-01",
        },
        vi.fn(),
      ),
    );

    expect(result.current.sorting).toEqual([{ id: "createdAt", desc: false }]);
    expect(result.current.created).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(result.current.modified).toEqual({
      from: "2026-02-01",
      to: undefined,
    });
  });

  it("keeps filter identities stable across renders so columns are not rebuilt", () => {
    const urlState = { createdFrom: "2026-01-01" };
    const { result, rerender } = renderHook(() =>
      useListTableState(urlState, vi.fn()),
    );
    const first = result.current.created;

    rerender();

    expect(result.current.created).toBe(first);
  });

  it("writes a sorting change back to the URL and resets to page 1", () => {
    const updateUrl = vi.fn();
    const { result } = renderHook(() =>
      useListTableState({ sortBy: "name", sortDir: "asc" }, updateUrl),
    );

    result.current.onSortingChange([{ id: "modifiedAt", desc: true }]);

    expect(updateUrl).toHaveBeenCalledWith({
      sortBy: "modifiedAt",
      sortDir: "desc",
      page: "1",
    });
  });

  it("passes the current sorting to an updater function", () => {
    const updateUrl = vi.fn();
    const { result } = renderHook(() =>
      useListTableState({ sortBy: "name", sortDir: "asc" }, updateUrl),
    );

    result.current.onSortingChange((current) => [
      { id: current[0].id, desc: !current[0].desc },
    ]);

    expect(updateUrl).toHaveBeenCalledWith({
      sortBy: "name",
      sortDir: "desc",
      page: "1",
    });
  });
});
