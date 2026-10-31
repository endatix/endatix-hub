import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../checkbox";

const icon = (name: string) =>
  screen.getByRole("checkbox").querySelector(`svg.lucide-${name}`);

describe("Checkbox", () => {
  it("draws a check when checked", () => {
    render(<Checkbox aria-label="All" checked />);

    expect(icon("check")).not.toBeNull();
    expect(icon("minus")).toBeNull();
  });

  it("draws a dash, not a check, when some are checked", () => {
    render(<Checkbox aria-label="All" checked="indeterminate" />);

    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe(
      "mixed",
    );
    expect(icon("minus")).not.toBeNull();
    expect(icon("check")).toBeNull();
  });
});
