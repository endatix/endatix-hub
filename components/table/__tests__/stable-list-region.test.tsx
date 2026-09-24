import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StableListRegion } from "../stable-list-region";

let height = 0;
let notifyResize: () => void = () => {};

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ height }) as DOMRect,
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function region(scopeKey: string) {
  return (
    <StableListRegion scopeKey={scopeKey} data-testid="region">
      rows
    </StableListRegion>
  );
}

function resizeTo(next: number) {
  height = next;
  act(() => notifyResize());
}

describe("StableListRegion", () => {
  it("keeps its tallest height while paging in one scope", () => {
    height = 400;
    render(region("users|size=10"));

    resizeTo(120); // skeleton or a short last page

    expect(screen.getByTestId("region").style.minHeight).toBe("400px");
  });

  it("grows with taller pages", () => {
    height = 400;
    render(region("users|size=10"));

    resizeTo(520);

    expect(screen.getByTestId("region").style.minHeight).toBe("520px");
  });

  it("releases the hold when the scope changes", () => {
    height = 400;
    const view = render(region("users|size=10"));

    height = 150;
    view.rerender(region("users|size=10|search=ada"));

    expect(screen.getByTestId("region").style.minHeight).toBe("150px");
  });
});
