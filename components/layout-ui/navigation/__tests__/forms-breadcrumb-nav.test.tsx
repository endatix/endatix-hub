import { render, screen } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it } from "vitest";
import type { FormsBreadcrumbItem } from "@/features/folders/types";
import FormsBreadcrumbNav from "../forms-breadcrumb-nav";

const link = (label: string, href: string): FormsBreadcrumbItem => ({
  type: "link",
  label,
  href: href as Route,
});

const FORM_TRAIL: FormsBreadcrumbItem[] = [
  link("Forms", "/forms"),
  link("Flows", "/forms/folders/flows"),
  link("Cedar Grove Pulse", "/forms/f1"),
  {
    type: "dropdown",
    label: "Participants",
    options: [{ label: "Participants", href: "/forms/f1/audience" as Route }],
  },
];

describe("FormsBreadcrumbNav", () => {
  it("starts at Forms, without a Home crumb", () => {
    // Arrange & Act
    render(<FormsBreadcrumbNav items={[link("Forms", "/forms")]} />);

    // Assert
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
    expect(screen.getByRole("link", { name: "Forms" })).toBeDefined();
  });

  it("keeps a short trail on one line below md by folding every crumb but the last", () => {
    // Arrange
    const trail: FormsBreadcrumbItem[] = [
      link("Forms", "/forms"),
      link("Flows", "/forms/folders/flows"),
      { type: "page", label: "Cedar Grove Pulse" },
    ];

    // Act
    render(<FormsBreadcrumbNav items={trail} />);

    // Assert — wide trail shows Flows; the narrow trail only shows it from the ellipsis
    expect(screen.getByRole("link", { name: "Flows" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Show the rest of the trail" }),
    ).toBeDefined();
    const current = screen.getAllByText("Cedar Grove Pulse");
    expect(current).toHaveLength(2);
    expect(current[0].className).toContain("block");
    expect(current[0].className).toContain("truncate");
  });

  it("folds the middle of a long trail and keeps the first crumb and last two", () => {
    // Arrange & Act
    render(<FormsBreadcrumbNav items={FORM_TRAIL} />);

    // Assert
    expect(screen.getAllByRole("link", { name: "Forms" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Flows" })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "Show the rest of the trail" }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Cedar Grove Pulse" })).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Participants navigation" }),
    ).toHaveLength(2);
  });
});
