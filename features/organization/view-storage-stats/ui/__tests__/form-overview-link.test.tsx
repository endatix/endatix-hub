import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormOverviewLink } from "../form-overview-link";

describe("FormOverviewLink", () => {
  it("opens the form in a new tab with muted styling", () => {
    render(<FormOverviewLink formId={42} label="Customer feedback" />);

    const link = screen.getByRole("link", { name: /Customer feedback/i });
    expect(link.getAttribute("href")).toBe("/forms/42");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.className).toContain("text-muted-foreground");
  });
});
