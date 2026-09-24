import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHeldHeight } from "../use-held-height";

let height = 0;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ height }) as DOMRect,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Region({ isPending }: Readonly<{ isPending: boolean }>) {
  const { ref, style } = useHeldHeight(isPending);
  return <div ref={ref} style={style} data-testid="region" />;
}

const minHeight = () => screen.getByTestId("region").style.minHeight;

describe("useHeldHeight", () => {
  it("holds the last rendered height while pending", () => {
    height = 400;
    const view = render(<Region isPending={false} />);

    height = 120; // the skeleton is shorter
    view.rerender(<Region isPending />);

    expect(minHeight()).toBe("400px");
  });

  it("releases the hold once rows render, so a smaller result shrinks", () => {
    height = 400;
    const view = render(<Region isPending={false} />);
    view.rerender(<Region isPending />);

    height = 60; // one matching row
    view.rerender(<Region isPending={false} />);

    expect(minHeight()).toBe("");
  });

  it("shrinks the same way every time, not only after the first filter", () => {
    height = 400;
    const view = render(<Region isPending={false} />);
    for (const rows of [60, 400, 60]) {
      view.rerender(<Region isPending />);
      height = rows;
      view.rerender(<Region isPending={false} />);
      expect(minHeight()).toBe("");
    }
  });
});
