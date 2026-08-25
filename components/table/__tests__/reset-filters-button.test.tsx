import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResetFiltersButton } from "../reset-filters-button";

describe("ResetFiltersButton", () => {
  it("exposes an accessible name and calls onClick", () => {
    const onClick = vi.fn();
    render(<ResetFiltersButton onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Reset Filters" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button and does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(<ResetFiltersButton onClick={onClick} disabled />);

    const button = screen.getByRole("button", {
      name: "Reset Filters",
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
