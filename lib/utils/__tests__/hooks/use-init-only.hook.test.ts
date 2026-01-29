import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useInitOnly } from "../../hooks/use-init-only.hook";

describe("useInitOnly", () => {
  it("returns a ref with the initial value", () => {
    const initial = { id: 1 };
    const { result } = renderHook(() => useInitOnly(initial));

    expect(result.current.current).toBe(initial);
  });

  it("updates ref.current when value changes (after effect runs)", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useInitOnly(value),
      { initialProps: { value: 1 } },
    );

    expect(result.current.current).toBe(1);

    rerender({ value: 2 });

    expect(result.current.current).toBe(2);
  });

  it("keeps the same ref identity across rerenders", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useInitOnly(value),
      { initialProps: { value: "a" } },
    );

    const refA = result.current;
    rerender({ value: "b" });
    const refB = result.current;

    expect(refA).toBe(refB);
  });

  it("handles undefined value", () => {
    const { result } = renderHook(() =>
      useInitOnly<{ id?: string } | undefined>(undefined),
    );

    expect(result.current.current).toBeUndefined();
  });

  it("handles value changing to undefined", () => {
    const obj = { id: "x" };
    const { result, rerender } = renderHook(
      ({ value }: { value: typeof obj | undefined }) => useInitOnly(value),
      { initialProps: { value: obj } },
    );

    expect(result.current.current).toBe(obj);

    rerender({ value: undefined as unknown as typeof obj });

    expect(result.current.current).toBeUndefined();
  });
});
