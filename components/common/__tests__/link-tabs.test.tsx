import { render, screen } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it } from "vitest";
import { LinkTabs, type LinkTab } from "../link-tabs";

const TABS: LinkTab[] = [
  { id: "overview", label: "Overview", href: "/forms/f1" as Route },
  { id: "design", label: "Design", href: "/forms/f1/design" as Route },
  {
    id: "audience",
    label: "Audience",
    href: "/forms/f1/audience" as Route,
    count: 1240,
  },
];

describe("LinkTabs", () => {
  it("marks only the active tab as the current page", () => {
    // Arrange & Act
    render(<LinkTabs label="Form" tabs={TABS} activeId="design" />);

    // Assert
    expect(
      screen.getByRole("link", { name: "Design" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Overview" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("shows a count after the label", () => {
    // Arrange & Act
    render(<LinkTabs label="Form" tabs={TABS} />);

    // Assert
    expect(screen.getByRole("link", { name: "Audience 1,240" })).toBeDefined();
  });
});
