import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CellDate } from "../../../ui/table/cell-date";
import { CellCompleteStatus } from "../../../ui/table/cell-complete-status";
import { CellCompletionTime } from "../../../ui/table/cell-completion-time";

describe("CellDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders relative time for recent dates", () => {
    // Arrange
    const recent = new Date("2026-07-25T10:00:00.000Z");

    // Act
    render(<CellDate date={recent} />);

    // Assert
    expect(screen.getByText(/hour/i)).toBeDefined();
  });

  it("renders dash when date is missing", () => {
    // Arrange & Act
    render(<CellDate />);

    // Assert
    expect(screen.getByText("-")).toBeDefined();
  });

  it("returns null when not visible", () => {
    // Arrange & Act
    const { container } = render(
      <CellDate date={new Date("2026-07-25T10:00:00.000Z")} visible={false} />,
    );

    // Assert
    expect(container.innerHTML).toBe("");
  });
});

describe("CellCompleteStatus", () => {
  it("exposes accessible Complete label for completed rows", () => {
    // Arrange & Act
    render(<CellCompleteStatus isComplete />);

    // Assert
    expect(screen.getByLabelText("Complete")).toBeDefined();
  });

  it("exposes accessible Incomplete label for incomplete rows", () => {
    // Arrange & Act
    render(<CellCompleteStatus isComplete={false} />);

    // Assert
    expect(screen.getByLabelText("Incomplete")).toBeDefined();
  });
});

describe("CellCompletionTime", () => {
  it("renders compact duration shorthand", () => {
    // Arrange
    const startedAt = new Date("2026-07-21T14:39:00.000Z");
    const completedAt = new Date("2026-07-21T14:40:41.000Z");

    // Act
    render(
      <CellCompletionTime startedAt={startedAt} completedAt={completedAt} />,
    );

    // Assert
    expect(screen.getByText("1m 41s")).toBeDefined();
  });
});
