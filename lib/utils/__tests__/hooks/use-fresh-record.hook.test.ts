import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { useFreshRecord } from "@/lib/utils/hooks/use-fresh-record.hook";

type Row = { id: string; count: number };

const snapshot: Row = { id: "f1", count: 1 };

describe("useFreshRecord", () => {
  it("shows the snapshot as refreshing until the read lands, then the fresh record", async () => {
    // Arrange
    const read = vi.fn(async () => Result.success({ id: "f1", count: 7 }));

    // Act
    const { result } = renderHook(() =>
      useFreshRecord(snapshot, "f1", read),
    );

    // Assert
    expect(result.current).toEqual({ record: snapshot, refreshing: true });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.record.count).toBe(7);
    expect(read).toHaveBeenCalledWith("f1");
  });

  it("keeps the snapshot when the read fails or throws", async () => {
    // Arrange
    const failed = vi.fn(async () => Result.error<Row>("Failed"));
    const thrown = vi.fn(async (): Promise<Result<Row>> => {
      throw new Error("network");
    });

    // Act
    const a = renderHook(() => useFreshRecord(snapshot, "f1", failed));
    const b = renderHook(() => useFreshRecord(snapshot, "f1", thrown));

    // Assert
    await waitFor(() => expect(a.result.current.refreshing).toBe(false));
    await waitFor(() => expect(b.result.current.refreshing).toBe(false));
    expect(a.result.current.record).toBe(snapshot);
    expect(b.result.current.record).toBe(snapshot);
  });

  it("ignores an answer for a record that is no longer shown", async () => {
    // Arrange
    let answerFirst: (value: Result<Row>) => void = () => undefined;
    const read = vi.fn((key: string) =>
      key === "f1"
        ? new Promise<Result<Row>>((resolve) => (answerFirst = resolve))
        : Promise.resolve(Result.success({ id: "f2", count: 2 })),
    );
    const { result, rerender } = renderHook(
      ({ row }) => useFreshRecord(row, row.id, read),
      { initialProps: { row: snapshot } },
    );

    // Act
    rerender({ row: { id: "f2", count: 0 } });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    answerFirst(Result.success({ id: "f1", count: 99 }));

    // Assert
    await Promise.resolve();
    expect(result.current.record).toEqual({ id: "f2", count: 2 });
  });
});
