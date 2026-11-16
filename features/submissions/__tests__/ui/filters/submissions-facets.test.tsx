import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SubmissionsFacets } from "../../../ui/filters/submissions-facets";
import { stubResizeObserver } from "@/test/stubs/resize-observer";

beforeEach(() => {
  stubResizeObserver();
});
Element.prototype.scrollIntoView = vi.fn();

function renderToolbar(
  collectionStatus: string[],
  onCollectionStatusChange = vi.fn(),
) {
  const noop = vi.fn();
  render(
    <SubmissionsFacets
      collectionStatusFilter={new Set(collectionStatus)}
      statusFilter={new Set()}
      testSubmissionFilter={new Set()}
      onCollectionStatusChange={onCollectionStatusChange}
      onStatusChange={noop}
      onTestSubmissionChange={noop}
    />,
  );
  return onCollectionStatusChange;
}

describe("SubmissionsFacets", () => {
  it("renders submission type filter", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFacets
        collectionStatusFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
      />,
    );

    // Assert
    expect(screen.getByText("Submission Type")).toBeDefined();
  });

  it("disables the filter controls when disabled", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFacets
        collectionStatusFilter={new Set(["not_started"])}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onCollectionStatusChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
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
    for (const heading of [
      /^not started/i,
      /^in progress/i,
      /^screened out/i,
    ]) {
      expect(screen.getByRole("option", { name: heading })).toBeDefined();
    }
    const notStarted = screen.getByRole("option", { name: /^not started/i });
    expect(
      notStarted.querySelector("[data-tone]")?.getAttribute("data-tone"),
    ).toBe("idle");
    const screenedOut = screen.getByRole("option", { name: /^screened out/i });
    expect(
      screenedOut.querySelector("[data-tone]")?.getAttribute("data-tone"),
    ).toBe("off");
    expect(screen.queryByRole("option", { name: /^cancelled/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /^expired/i })).toBeNull();
    const viewed = screen.getByRole("option", { name: /^viewed/i });
    expect(viewed.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe(
      "idle",
    );
  });

  it("selects Screened out from its own row", () => {
    // Arrange
    const onChange = renderToolbar([]);
    fireEvent.click(screen.getByRole("button", { name: /^status/i }));

    // Act
    fireEvent.click(screen.getByRole("option", { name: /^screened out/i }));

    // Assert
    expect([...(onChange.mock.calls[0][0] as Set<string>)]).toEqual([
      "screen_out",
    ]);
  });

  it("shows a selected unshipped code from an old link under its group heading", () => {
    // Arrange
    const onChange = renderToolbar(["cancelled"]);
    fireEvent.click(screen.getByRole("button", { name: /^status/i }));

    // Act
    fireEvent.click(screen.getByRole("option", { name: /^ended/i }));

    // Assert
    expect(screen.getByRole("option", { name: /^cancelled/i })).toBeDefined();
    expect([...(onChange.mock.calls[0][0] as Set<string>)].sort()).toEqual([
      "cancelled",
      "screen_out",
    ]);
  });

  it("names the selected status when its group has one code", () => {
    // Act
    renderToolbar(["not_started"]);

    // Assert
    expect(
      screen.getByRole("button", { name: /^status/i }).textContent,
    ).toContain("Not started");
  });
});
