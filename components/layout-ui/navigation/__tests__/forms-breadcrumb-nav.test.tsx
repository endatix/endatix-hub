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
  link("Muestra Co", "/forms/f1"),
  {
    type: "dropdown",
    label: "Audience",
    options: [{ label: "Audience", href: "/forms/f1/audience" as Route }],
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

  it("folds the middle of a long trail and keeps the first crumb and last two", () => {
    // Arrange & Act
    render(<FormsBreadcrumbNav items={FORM_TRAIL} />);

    // Assert
    expect(screen.getByRole("link", { name: "Forms" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Flows" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Show the rest of the trail" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Muestra Co" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Audience navigation" }),
    ).toBeDefined();
  });
});
