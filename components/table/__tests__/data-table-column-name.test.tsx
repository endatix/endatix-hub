import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTableColumnName } from "../data-table-column-name";

const PREFIX = "QUESTION_VERY_LONG_BRAND_AWARENESS_AIDED_RECALL_GRID";

function visibleParts(container: HTMLElement) {
  const part = (slot: string) =>
    container.querySelector(`[data-slot="${slot}"]`)?.textContent;
  return { head: part("column-name-head"), tail: part("column-name-tail") };
}

describe("DataTableColumnName", () => {
  it("keeps the choice suffix of two names that differ only there", () => {
    // Arrange & Act
    const alpha = render(<DataTableColumnName name={`${PREFIX}__Alpha`} />);
    const beta = render(<DataTableColumnName name={`${PREFIX}__Beta`} />);

    // Assert
    expect(visibleParts(alpha.container)).toEqual({
      head: PREFIX,
      tail: "__Alpha",
    });
    expect(visibleParts(beta.container)).toEqual({
      head: PREFIX,
      tail: "__Beta",
    });
  });

  it("keeps the full name as its accessible text", () => {
    // Arrange & Act
    render(
      <button type="button">
        <DataTableColumnName name={`${PREFIX}__Alpha`} />
      </button>,
    );

    // Assert
    expect(
      screen.getByRole("button", { name: `${PREFIX}__Alpha` }),
    ).toBeTruthy();
  });

  it("keeps the last suffix when a name has several", () => {
    // Arrange & Act
    const { container } = render(
      <DataTableColumnName name="matrix__row_one__Alpha" />,
    );

    // Assert
    expect(visibleParts(container)).toEqual({
      head: "matrix__row_one",
      tail: "__Alpha",
    });
  });

  it.each([
    ["no suffix", "QUESTION_VERY_LONG_NAME", "QUESTION_VERY_LONG_", "NAME"],
    ["a leading separator", "__QUESTION_NAME", "__QUESTION_", "NAME"],
    ["a trailing separator", "QUESTION_NAME__", "QUESTION_NA", "ME__"],
  ])("keeps the start and end of a name with %s", (_case, name, head, tail) => {
    // Arrange & Act
    const { container } = render(<DataTableColumnName name={name} />);

    // Assert
    expect(visibleParts(container)).toEqual({ head, tail });
  });

  it("shows a short name whole", () => {
    // Arrange & Act
    const { container } = render(<DataTableColumnName name="Q1" />);

    // Assert
    expect(visibleParts(container)).toEqual({ head: "", tail: "Q1" });
  });

  it("adds its class to the label", () => {
    // Arrange & Act
    const { container } = render(
      <DataTableColumnName name="Q1" className="normal-case" />,
    );

    // Assert
    expect(container.firstElementChild?.className).toContain("normal-case");
  });
});
