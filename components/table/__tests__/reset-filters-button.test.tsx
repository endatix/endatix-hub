import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ResetFiltersButton } from "../reset-filters-button";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

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

  it("shows Reset Sorting when only sorting is active", () => {
    const onResetSorting = vi.fn();
    render(
      <ResetFiltersButton
        hasSorting
        hasFilters={false}
        onResetSorting={onResetSorting}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset Sorting" }));
    expect(onResetSorting).toHaveBeenCalledTimes(1);
  });

  it("renders a dropdown when both filters and sorting are active", () => {
    const onClick = vi.fn();
    const onResetSorting = vi.fn();
    render(
      <ResetFiltersButton
        onClick={onClick}
        onResetSorting={onResetSorting}
        hasFilters
        hasSorting
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reset filters and sorting" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: "Reset Filters" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onResetSorting).not.toHaveBeenCalled();
  });

  it("reset all runs onResetAll when provided", () => {
    const onClick = vi.fn();
    const onResetSorting = vi.fn();
    const onResetAll = vi.fn();
    render(
      <ResetFiltersButton
        onClick={onClick}
        onResetSorting={onResetSorting}
        onResetAll={onResetAll}
        hasFilters
        hasSorting
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Reset All" }));

    expect(onResetAll).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(onResetSorting).not.toHaveBeenCalled();
  });

  it("renders nothing when neither filters nor sorting are active", () => {
    const { container } = render(
      <ResetFiltersButton hasFilters={false} hasSorting={false} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
