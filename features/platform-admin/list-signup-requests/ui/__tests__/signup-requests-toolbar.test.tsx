import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SignupRequestsUrlState } from "../../signup-requests-url-state";
import { SignupRequestsToolbar } from "../signup-requests-toolbar";

/** Below 768 px: the toolbar shows Filters, and ResponsivePanel is a Drawer. */
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

function renderToolbar(urlState: SignupRequestsUrlState) {
  const onClearFilters = vi.fn();
  render(
    <SignupRequestsToolbar
      search={urlState.search}
      setSearch={vi.fn()}
      updateUrl={vi.fn()}
      urlState={urlState}
      onClearFilters={onClearFilters}
    />,
  );
  return onClearFilters;
}

describe("SignupRequestsToolbar on a phone", () => {
  it("does not count the default Pending view as a filter", () => {
    // Arrange & Act
    renderToolbar({ search: "", status: "pending" });

    // Assert
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
  });

  it("counts a status other than Pending and offers Reset in the toolbar", () => {
    // Arrange & Act
    renderToolbar({ search: "", status: "approved" });

    // Assert
    expect(screen.getByRole("button", { name: "Filters · 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset Filters" })).toBeTruthy();
  });

  it("puts the status under its own label in the Filters drawer", () => {
    // Arrange
    renderToolbar({ search: "", status: "approved" });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));

    // Assert
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(within(drawer).getByLabelText("Status").textContent).toContain(
      "Approved",
    );
  });

  it("resets with the list's one clear, which the empty state also uses, from the toolbar and the drawer", () => {
    // Arrange
    const onClearFilters = renderToolbar({ search: "acme", status: "all" });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    fireEvent.click(within(drawer).getByRole("button", { name: "Reset" }));

    // Assert
    expect(onClearFilters).toHaveBeenCalledTimes(2);
  });
});
