import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDataListSource } from "../use-data-list-source.hook";
import { FILE_SIZE_ERROR, MAX_FILE_SIZE_BYTES } from "../../utils";

describe("useDataListSource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on json and can switch to csv", () => {
    const { result } = renderHook(() => useDataListSource());

    expect(result.current.format).toBe("json");
    expect(result.current.canConfirm).toBe(false);

    act(() => {
      result.current.setFormat("csv");
      result.current.setCsvInput("value,default,es\r\napple,Apple,Manzana\r\n");
    });

    expect(result.current.format).toBe("csv");
    expect(result.current.csvDiscovery?.rowCount).toBe(1);
    expect(result.current.canConfirm).toBe(true);
  });

  it("treats valid json as confirmable", () => {
    const { result } = renderHook(() => useDataListSource());

    act(() => {
      result.current.setJsonInput('[{"label": "A", "value": "a"}]');
    });

    expect(result.current.canConfirm).toBe(true);
    expect(result.current.hasSourceContent).toBe(true);
  });

  it("rejects oversized files", () => {
    const { result } = renderHook(() => useDataListSource());

    const largeFile = new File([""], "big.csv", { type: "text/csv" });
    Object.defineProperty(largeFile, "size", {
      value: MAX_FILE_SIZE_BYTES + 1,
    });

    act(() => {
      void result.current.handleFileSelected(largeFile);
    });

    expect(result.current.validationError).toBe(FILE_SIZE_ERROR);
    expect(result.current.selectedFileName).toBe("big.csv");
  });

  it("infers csv from file extension", async () => {
    const { result } = renderHook(() =>
      useDataListSource({ initialFormat: "json" }),
    );

    const file = new File(["value,default\r\na,A\r\n"], "items.csv", {
      type: "text/csv",
    });

    await act(async () => {
      await result.current.handleFileSelected(file);
    });

    expect(result.current.format).toBe("csv");
    expect(result.current.csvInput).toContain("value,default");
    expect(result.current.canConfirm).toBe(true);
  });
});
