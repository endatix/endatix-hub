import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacetedFilter, type FacetedFilterGroup } from "../faceted-filter";

// cmdk measures its list and scrolls the active item into view; jsdom has neither.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = vi.fn();

const groups: FacetedFilterGroup[] = [
  {
    label: "Not engaged",
    tone: "idle",
    options: [
      { label: "Not started", value: "not_started", tone: "idle" },
      { label: "Viewed", value: "viewed", tone: "idle" },
    ],
  },
  {
    label: "Complete",
    tone: "on",
    options: [{ label: "Complete", value: "complete", tone: "on" }],
  },
];

function renderGrouped(selected: string[], onValueChange = vi.fn()) {
  render(
    <FacetedFilter
      title="Status"
      groups={groups}
      selectedValues={new Set(selected)}
      onValueChange={onValueChange}
    />,
  );
  return onValueChange;
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /^status/i }));
}

function row(name: RegExp) {
  return screen.getByRole("option", { name });
}

describe("FacetedFilter with groups", () => {
  it("selects every option of a group from its heading", () => {
    // Arrange
    const onValueChange = renderGrouped(["complete"]);
    openMenu();

    // Act
    fireEvent.click(row(/^not engaged/i));

    // Assert
    const next = onValueChange.mock.calls[0][0] as Set<string>;
    expect([...next].sort()).toEqual(["complete", "not_started", "viewed"]);
  });

  it("clears a fully selected group from its heading", () => {
    // Arrange
    const onValueChange = renderGrouped(["not_started", "viewed"]);
    openMenu();

    // Act
    fireEvent.click(row(/^not engaged/i));

    // Assert
    expect([...(onValueChange.mock.calls[0][0] as Set<string>)]).toEqual([]);
  });

  it("marks a partly selected group heading as some selected", () => {
    // Arrange
    renderGrouped(["viewed"]);

    // Act
    openMenu();

    // Assert
    const heading = row(/^not engaged/i);
    expect(heading.getAttribute("data-selection")).toBe("some");
    expect(heading.textContent).toContain("some selected");
  });

  it("toggles a single option inside a group", () => {
    // Arrange
    const onValueChange = renderGrouped([]);
    openMenu();

    // Act
    fireEvent.click(row(/^viewed/i));

    // Assert
    expect([...(onValueChange.mock.calls[0][0] as Set<string>)]).toEqual([
      "viewed",
    ]);
  });

  it("renders a one-option group as one top-level row, like a group heading", () => {
    // Arrange
    renderGrouped([]);

    // Act
    openMenu();

    // Assert
    const rows = screen.getAllByRole("option", { name: /^complete/i });
    expect(rows).toHaveLength(1);
    const [complete] = rows;
    expect(complete.querySelector('[data-slot="badge"]')).toBeNull();
    expect(
      complete.querySelector("[data-tone]")?.getAttribute("data-tone"),
    ).toBe("on");
    expect(complete.className).not.toContain("pl-8");
    expect(complete.textContent).toContain("not selected");
  });

  it("toggles a one-option group's value from its row", () => {
    // Arrange
    const onValueChange = renderGrouped(["viewed"]);
    openMenu();

    // Act
    fireEvent.click(row(/^complete/i));

    // Assert
    expect([...(onValueChange.mock.calls[0][0] as Set<string>)].sort()).toEqual(
      ["complete", "viewed"],
    );
  });

  it("says a selected one-option group is selected, not all selected", () => {
    // Arrange
    renderGrouped(["complete"]);

    // Act
    openMenu();

    // Assert
    const text = row(/^complete/i).textContent ?? "";
    expect(text).toContain("selected");
    expect(text).not.toContain("all selected");
    expect(text).not.toContain("not selected");
  });

  it("indents a multi-option group's rows under its heading", () => {
    // Arrange
    renderGrouped([]);

    // Act
    openMenu();

    // Assert
    expect(row(/^viewed/i).className).toContain("pl-8");
    expect(row(/^not engaged/i).className).not.toContain("pl-8");
  });

  it("renders state options as status badges with their tone", () => {
    // Arrange
    renderGrouped([]);

    // Act
    openMenu();

    // Assert
    const badge = row(/^viewed/i).querySelector("[data-tone]");
    expect(badge?.getAttribute("data-tone")).toBe("idle");
  });

  it("finds a group's options by the group's name", () => {
    // Arrange
    renderGrouped([]);
    openMenu();

    // Act
    fireEvent.change(screen.getByPlaceholderText("Status"), {
      target: { value: "not engaged" },
    });

    // Assert
    expect(row(/^viewed/i)).toBeDefined();
    expect(screen.queryByRole("option", { name: /^complete/i })).toBeNull();
  });

  it("summarises a fully selected group as one chip on the trigger", () => {
    // Act
    renderGrouped(["not_started", "viewed"]);

    // Assert
    const trigger = screen.getByRole("button", { name: /^status/i });
    expect(trigger.textContent).toContain("Not engaged");
    expect(trigger.textContent).not.toContain("Viewed");
  });

  it("collapses more than two chips to a count of selected values", () => {
    // Act
    render(
      <FacetedFilter
        title="Status"
        groups={[
          ...groups,
          {
            label: "Ended",
            tone: "off",
            options: [
              { label: "Cancelled", value: "cancelled", tone: "off" },
              { label: "Abandoned", value: "abandoned", tone: "off" },
            ],
          },
        ]}
        selectedValues={new Set(["viewed", "complete", "cancelled"])}
        onValueChange={vi.fn()}
      />,
    );

    // Assert
    expect(
      screen.getByRole("button", { name: /^status/i }).textContent,
    ).toContain("3 selected");
  });
});

describe("FacetedFilter with flat options", () => {
  it("keeps the flat list behaviour", () => {
    // Arrange
    const onValueChange = vi.fn();
    render(
      <FacetedFilter
        title="Submission Type"
        options={[
          { label: "Production", value: "false" },
          { label: "Test", value: "true" },
        ]}
        selectedValues={new Set()}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /submission type/i }));

    // Act
    fireEvent.click(screen.getByRole("option", { name: /^test/i }));

    // Assert
    expect([...(onValueChange.mock.calls[0][0] as Set<string>)]).toEqual([
      "true",
    ]);
  });
});
