import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemValue } from "survey-core";
import { ReactElementFactory } from "survey-react-ui";
import { PREFILL_CHOICE, registerPrefillChoice } from "../prefill-choice";

function row(text: string, kind?: string) {
  registerPrefillChoice();
  const item = new ItemValue("region", text);
  if (kind) item.setPropertyValue("edxPrefillKind", kind);
  return render(ReactElementFactory.Instance.createElement(PREFILL_CHOICE, { item }));
}

describe("Prefill from row", () => {
  it("shows the Property name and its type as a flex row", () => {
    // Act
    row("Region", "Single choice. Use a Dropdown question.");

    // Assert
    expect(screen.getByText("Region")).toBeTruthy();
    expect(screen.getByText("Single choice. Use a Dropdown question.")).toBeTruthy();
    const rowEl = screen.getByText("Region").parentElement;
    expect(rowEl?.className).toContain("flex!");
    expect(screen.getByText("Region").className).toContain("truncate");
    expect(screen.getByText("Single choice. Use a Dropdown question.").className).toContain(
      "whitespace-normal!",
    );
  });

  it("shows only the name when the row has no type", () => {
    // Act
    const { container } = row("Custom expression");

    // Assert
    expect(container.textContent).toBe("Custom expression");
  });
});
