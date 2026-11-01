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
  it("stacks the Property name above its type", () => {
    // Act
    row("Family size", "Single choice. Use a Dropdown, Radio or Button group question.");

    // Assert
    const name = screen.getByText("Family size");
    const hint = screen.getByText("Single choice. Use a Dropdown, Radio or Button group question.");
    expect(name.parentElement?.className).toContain("flex-col");
    expect(name.className).toContain("whitespace-normal!");
    expect(name.className).not.toContain("truncate");
    expect(hint.className).toContain("whitespace-normal!");
    expect(hint.className).toContain("text-xs");
    expect(hint.className).not.toContain("truncate");
  });

  it("shows only the name when the row has no type", () => {
    // Act
    const { container } = row("Custom expression");

    // Assert
    expect(container.textContent).toBe("Custom expression");
  });
});
