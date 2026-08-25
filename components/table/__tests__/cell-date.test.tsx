import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CellDate } from "../cell-date";

describe("CellDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders relative time for recent dates after mount", () => {
    const recent = new Date("2026-07-25T10:00:00.000Z");

    render(<CellDate date={recent} />);

    expect(screen.getByText(/hour/i)).toBeDefined();
  });

  it("renders dash when date is missing", () => {
    render(<CellDate />);

    expect(screen.getByText("-")).toBeDefined();
  });

  it("returns null when not visible", () => {
    const { container } = render(
      <CellDate date={new Date("2026-07-25T10:00:00.000Z")} visible={false} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
