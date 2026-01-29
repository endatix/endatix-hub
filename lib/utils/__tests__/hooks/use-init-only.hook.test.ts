import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useInitOnly } from "../../hooks/use-init-only.hook";

describe("useInitOnly", () => {
  it("returns a ref with the initial value", () => {
    // Arrange
    const initial = { id: 1 };

    // Act
    const { result } = renderHook(() => useInitOnly(initial));

    // Assert
    expect(result.current.current).toBe(initial);
  });

  it("updates ref.current when value changes (after effect runs)", () => {
    // Arrange & Act
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useInitOnly(value),
      { initialProps: { value: 1 } },
    );

    // Assert
    expect(result.current.current).toBe(1);

    // Act
    rerender({ value: 2 });

    // Assert
    expect(result.current.current).toBe(2);
  });

  it("keeps the same ref identity across rerenders", () => {
    // Arrange & Act
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useInitOnly(value),
      { initialProps: { value: "a" } },
    );
    const refA = result.current;

    // Act
    rerender({ value: "b" });
    const refB = result.current;

    // Assert
    expect(refA).toBe(refB);
  });

  it("handles undefined value", () => {
    // Act
    const { result } = renderHook(() =>
      useInitOnly<{ id?: string } | undefined>(undefined),
    );

    // Assert
    expect(result.current.current).toBeUndefined();
  });

  it("handles value changing to undefined", () => {
    // Arrange & Act
    const obj = { id: "x" };
    const { result, rerender } = renderHook(
      ({ value }: { value: typeof obj | undefined }) => useInitOnly(value),
      { initialProps: { value: obj } },
    );

    // Assert
    expect(result.current.current).toBe(obj);

    // Act
    rerender({ value: undefined as unknown as typeof obj });

    // Assert
    expect(result.current.current).toBeUndefined();
  });
});
