import { describe, expect, it, vi } from "vitest";
import { createUrlFilterUpdater } from "../list-table-url-utils";

describe("createUrlFilterUpdater", () => {
  it("clears the filter param when the sentinel value is selected", () => {
    // Arrange
    const updateUrl = vi.fn();
    const onFilterChange = createUrlFilterUpdater(
      updateUrl,
      "status",
      "__all_statuses__",
    );

    // Act
    onFilterChange("__all_statuses__");

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({
      status: null,
      page: "1",
    });
  });

  it("sets the filter param and resets page when a value is selected", () => {
    // Arrange
    const updateUrl = vi.fn();
    const onFilterChange = createUrlFilterUpdater(
      updateUrl,
      "status",
      "__all_statuses__",
    );

    // Act
    onFilterChange("active");

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({
      status: "active",
      page: "1",
    });
  });
});
