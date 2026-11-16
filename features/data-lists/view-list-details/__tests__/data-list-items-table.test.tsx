import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DataListItem } from "@/lib/endatix-api/data-lists/types";
import { DataListItemsTable } from "../ui/data-list-items-table";

function items(count: number): DataListItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${index + 1}`,
    value: `city-${index + 1}`,
    labels: { default: `City ${index + 1}` },
  }));
}

describe("DataListItemsTable", () => {
  it("shows every item of a 50-item server page", () => {
    // Arrange
    const page = items(50);

    // Act
    render(<DataListItemsTable items={page} labelColumns={["default"]} />);

    // Assert
    expect(screen.getAllByText(/^city-\d+$/)).toHaveLength(50);
  });
});
