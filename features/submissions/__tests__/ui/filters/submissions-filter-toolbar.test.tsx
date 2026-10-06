import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionsFilterToolbar } from "../../../ui/filters/submissions-filter-toolbar";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = vi.fn();

function renderToolbar(
  collectionStatus: string[],
  onCollectionStatusChange = vi.fn(),
) {
  const noop = vi.fn();
  render(
    <SubmissionsFilterToolbar
      collectionStatusFilter={new Set(collectionStatus)}
      statusFilter={new Set()}
      testSubmissionFilter={new Set()}
      onCollectionStatusChange={onCollectionStatusChange}
      onStatusChange={noop}
      onTestSubmissionChange={noop}
      onResetFilters={noop}
      onResetSorting={noop}
      onResetAll={noop}
    />,
  );
  return onCollectionStatusChange;
}

describe("SubmissionsFilterToolbar", () => {
  it("renders submission type filter", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        collectionStatusFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
        onResetSorting={onChange}
        onResetAll={onChange}
      />,
    );

    // Assert
    expect(screen.getByText("Submission Type")).toBeDefined();
  });

  it("shows reset button when test filter is active", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        collectionStatusFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set(["true"])}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
        onResetSorting={onChange}
        onResetAll={onChange}
      />,
    );

    // Assert
    expect(
      screen.getByRole("button", { name: /reset filters/i }),
    ).toBeDefined();
  });

  it("disables filter controls and reset when disabled", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        collectionStatusFilter={new Set(["not_started"])}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
        onResetSorting={onChange}
        onResetAll={onChange}
        disabled
      />,
    );

    // Assert
    expect(
      (screen.getByRole("button", { name: /^status/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /review/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /submission type/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /reset filters/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("groups the Status options by lifecycle, each code as its status badge", () => {
    // Arrange
    renderToolbar([]);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /^status/i }));

    // Assert
    const names = screen
      .getAllByRole("option")
      .map((option) => option.textContent ?? "");
    expect(names[0]).toMatch(/^Complete/);
    for (const heading of [/^not engaged/i, /^collecting/i, /^ended/i]) {
      expect(screen.getByRole("option", { name: heading })).toBeDefined();
    }
    const notStarted = screen.getByRole("option", { name: /^not started/i });
    expect(
      notStarted.querySelector("[data-tone]")?.getAttribute("data-tone"),
    ).toBe("idle");
    const cancelled = screen.getByRole("option", { name: /^cancelled/i });
    expect(
      cancelled.querySelector("[data-tone]")?.getAttribute("data-tone"),
    ).toBe("off");
  });

  it("selects every ended code from the Ended heading", () => {
    // Arrange
    const onChange = renderToolbar([]);
    fireEvent.click(screen.getByRole("button", { name: /^status/i }));

    // Act
    fireEvent.click(screen.getByRole("option", { name: /^ended/i }));

    // Assert
    expect([...(onChange.mock.calls[0][0] as Set<string>)].sort()).toEqual([
      "abandoned",
      "cancelled",
      "quota_full",
      "screen_out",
    ]);
  });

  it("names a fully selected lifecycle group on the Status trigger", () => {
    // Act
    renderToolbar(["not_started", "viewed"]);

    // Assert
    expect(
      screen.getByRole("button", { name: /^status/i }).textContent,
    ).toContain("Not engaged");
  });
});
