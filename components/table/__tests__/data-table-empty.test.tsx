import { fireEvent, render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { DataTableEmpty } from "../data-table-empty";

describe("DataTableEmpty", () => {
  it("keeps the one-line message when there is no title", () => {
    // Act
    render(<DataTableEmpty>No tenants found.</DataTableEmpty>);

    // Assert
    expect(screen.getByText("No tenants found.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the entity icon, title, description and clear-filters way out", () => {
    // Arrange
    const onClearFilters = vi.fn();
    const { container } = render(
      <DataTableEmpty
        icon={Inbox}
        title="No matching requests"
        onClearFilters={onClearFilters}
      >
        Search looks at the email and company.
      </DataTableEmpty>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Assert
    expect(screen.getByText("No matching requests")).toBeTruthy();
    expect(
      screen.getByText("Search looks at the email and company."),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-slot="empty-icon"] svg'),
    ).toBeTruthy();
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
