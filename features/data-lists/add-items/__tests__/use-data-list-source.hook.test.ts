import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDataListSource } from "../use-data-list-source.hook";
import {
  CSV_FILE_SIZE_ERROR,
  FILE_SIZE_ERROR,
  MAX_FILE_SIZE_BYTES,
} from "../../utils";
import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
} from "../../import-limits";

describe("useDataListSource", () => {
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

  it("rejects oversized json files", () => {
    const { result } = renderHook(() => useDataListSource());

    const largeFile = new File([""], "big.json", { type: "application/json" });
    Object.defineProperty(largeFile, "size", {
      value: MAX_FILE_SIZE_BYTES + 1,
    });

    act(() => {
      void result.current.handleFileSelected(largeFile);
    });

    expect(result.current.validationError).toBe(FILE_SIZE_ERROR);
    expect(result.current.selectedFileName).toBe("big.json");
  });

  it("rejects csv files above the csv character cap", async () => {
    const { result } = renderHook(() => useDataListSource());

    const content = "é".repeat(DATA_LIST_MAX_CSV_CHARS + 1);
    const largeFile = new File([content], "big.csv", { type: "text/csv" });

    await act(async () => {
      await result.current.handleFileSelected(largeFile);
    });

    expect(result.current.validationError).toBe(CSV_FILE_SIZE_ERROR);
    expect(result.current.selectedFileName).toBe("big.csv");
  });

  it("exposes sourceError for oversize csv row counts", () => {
    const { result } = renderHook(() =>
      useDataListSource({ initialFormat: "csv" }),
    );

    const rows = Array.from(
      { length: DATA_LIST_MAX_ITEMS + 1 },
      (_, index) => `v${index},Label ${index}`,
    ).join("\r\n");

    act(() => {
      result.current.setCsvInput(`value,default\r\n${rows}\r\n`);
    });

    expect(result.current.canConfirm).toBe(false);
    expect(result.current.sourceError).toContain(
      DATA_LIST_MAX_ITEMS.toLocaleString("en-US"),
    );
  });

  it("exposes a non-blocking sourceWarning for duplicate locale columns", () => {
    const { result } = renderHook(() =>
      useDataListSource({ initialFormat: "csv" }),
    );

    act(() => {
      result.current.setCsvInput(
        "value,default,it,IT\r\napple,Apple,Mela1,Mela2\r\n",
      );
    });

    expect(result.current.canConfirm).toBe(true);
    expect(result.current.sourceError).toBeNull();
    expect(result.current.sourceWarning).toContain(
      "Duplicate locale column 'IT'",
    );
  });

  it("exposes sourceError for json validation failures", () => {
    const { result } = renderHook(() => useDataListSource());

    act(() => {
      result.current.setJsonInput("[]");
    });

    expect(result.current.canConfirm).toBe(false);
    expect(result.current.sourceError).toContain("At least one item");
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

  it("keeps csvDiscovery stable when availableLocales is a new equal array", () => {
    // Arrange
    const csv = "value,default,es\r\napple,Apple,Manzana\r\n";
    const { result, rerender } = renderHook(
      ({ locales }) =>
        useDataListSource({
          initialFormat: "csv",
          availableLocales: locales,
        }),
      { initialProps: { locales: ["es"] } },
    );

    act(() => {
      result.current.setCsvInput(csv);
    });
    const firstDiscovery = result.current.csvDiscovery;

    // Act — new array reference, same contents
    rerender({ locales: ["es"] });

    // Assert
    expect(result.current.csvDiscovery).toBe(firstDiscovery);
  });
});
