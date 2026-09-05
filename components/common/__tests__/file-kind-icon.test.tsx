import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  FileKindIcon,
  FileKindLabel,
} from "@/components/common/file-kind-icon";

function iconClassName(container: HTMLElement): string {
  return container.querySelector("svg")?.getAttribute("class") ?? "";
}

describe("FileKindIcon", () => {
  it("renders the icon registered for the file kind", () => {
    // Arrange & Act
    const { container } = render(<FileKindIcon kind="xlsx" />);

    // Assert
    expect(iconClassName(container)).toContain("file-spreadsheet");
  });

  it("falls back to the generic file glyph for an unknown kind", () => {
    // Arrange & Act
    const { container } = render(<FileKindIcon />);

    // Assert
    const className = iconClassName(container);
    expect(className).toContain("lucide-file");
    expect(className).not.toContain("spreadsheet");
  });

  it("hides the icon from assistive tech — the label carries the meaning", () => {
    // Arrange & Act
    const { container } = render(<FileKindIcon kind="csv" />);

    // Assert
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("FileKindLabel", () => {
  it("renders the label next to its kind icon", () => {
    // Arrange & Act
    const { container, getByText } = render(
      <FileKindLabel kind="json">Codebook</FileKindLabel>,
    );

    // Assert
    expect(getByText("Codebook")).toBeTruthy();
    expect(iconClassName(container)).toContain("file-braces");
  });
});
