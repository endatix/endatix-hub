import { describe, expect, it } from "vitest";
import {
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";

describe("data-table-chrome", () => {
  it("pins left header cells above other sticky headers", () => {
    // Arrange & Act
    const className = dataTableHeaderCellClassName({ isPinnedLeft: true });

    // Assert
    expect(className).toContain("left-0");
    expect(className).toContain("z-30");
  });

  it("applies zebra row fills", () => {
    // Arrange & Act
    const even = dataTableBodyRowClassName({ isEvenRow: true });
    const odd = dataTableBodyRowClassName({ isEvenRow: false });

    // Assert
    expect(even).toContain("bg-surface-container-low");
    expect(odd).toContain("bg-surface-container-lowest");
  });

  it("uses accent fill for selected pinned cells", () => {
    // Arrange & Act
    const className = dataTableBodyCellClassName({
      isPinnedLeft: true,
      isEvenRow: true,
      isSelected: true,
    });

    // Assert
    expect(className).toContain("bg-accent");
    expect(className).toContain("sticky");
  });
});
