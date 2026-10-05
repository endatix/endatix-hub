import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CellCompleteStatus } from "../../../ui/table/cell-complete-status";
import { CellCompletionTime } from "../../../ui/table/cell-completion-time";

describe("CellCompleteStatus", () => {
  it("exposes accessible Complete label for completed rows", () => {
    // Arrange & Act
    render(<CellCompleteStatus isComplete />);

    // Assert
    expect(screen.getByText("Complete")).toBeDefined();
  });

  it("shows In progress when the row is incomplete and has no collection status", () => {
    // Arrange & Act
    render(<CellCompleteStatus isComplete={false} />);

    // Assert
    expect(
      screen
        .getByText("In progress")
        .closest("[data-tone]")
        ?.getAttribute("data-tone"),
    ).toBe("attention");
  });

  it("shows the collection status instead of the isComplete fallback", () => {
    // Arrange & Act
    render(
      <CellCompleteStatus isComplete={false} collectionStatus="cancelled" />,
    );

    // Assert
    expect(
      screen
        .getByText("Cancelled")
        .closest("[data-tone]")
        ?.getAttribute("data-tone"),
    ).toBe("off");
  });

  it.each([
    ["not_started", "Not started"],
    ["viewed", "Viewed"],
  ])("shows %s in the idle tone, apart from In progress", (code, label) => {
    // Arrange & Act
    render(<CellCompleteStatus isComplete={false} collectionStatus={code} />);

    // Assert
    const badge = screen.getByText(label).closest("[data-tone]");
    expect(badge?.getAttribute("data-tone")).toBe("idle");
    expect(badge?.getAttribute("data-variant")).toBe("info");
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
