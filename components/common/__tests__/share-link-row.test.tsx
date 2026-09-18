import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Link2 } from "lucide-react";
import {
  ShareLinkRow,
  ShareLinkRowHeader,
} from "@/components/common/share-link-row";

describe("ShareLinkRow", () => {
  it("renders the title, description, and read-only value", () => {
    // Arrange & Act
    render(
      <ShareLinkRow
        icon={Link2}
        title="Share"
        description="Continue and complete this submission."
        value="https://example.com/share/123?token=abc"
        copyLabel="Copy Share link"
      />,
    );

    // Assert
    expect(screen.getByRole("heading", { name: "Share" })).toBeDefined();
    expect(
      screen.getByText("Continue and complete this submission."),
    ).toBeDefined();
    expect(
      screen.getByDisplayValue("https://example.com/share/123?token=abc"),
    ).toBeDefined();
    expect(screen.getByLabelText("Copy Share link")).toBeDefined();
  });

  it("omits the footer row when none is given", () => {
    // Arrange & Act
    render(
      <ShareLinkRow
        icon={Link2}
        title="Share"
        description="Continue and complete this submission."
        value="https://example.com/share/123"
        copyLabel="Copy Share link"
      />,
    );

    // Assert
    expect(screen.queryByText(/Expires/)).toBeNull();
  });

  it("renders actions and footer when given", () => {
    // Arrange & Act
    render(
      <ShareLinkRow
        icon={Link2}
        title="Share"
        description="Continue and complete this submission."
        value="https://example.com/share/123"
        copyLabel="Copy Share link"
        actions={<button type="button">Regenerate</button>}
        footer={<span>Expires in 7 days</span>}
      />,
    );

    // Assert
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDefined();
    expect(screen.getByText("Expires in 7 days")).toBeDefined();
  });
});

describe("ShareLinkRowHeader", () => {
  it("renders the icon, title, and description without a value input", () => {
    // Arrange & Act
    render(
      <ShareLinkRowHeader
        icon={Link2}
        title="Export PDF"
        description="PDF export link for this submission."
      />,
    );

    // Assert
    expect(screen.getByRole("heading", { name: "Export PDF" })).toBeDefined();
    expect(
      screen.getByText("PDF export link for this submission."),
    ).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
