import { describe, expect, it } from "vitest";
import {
  DATA_TABLE_COLUMN_LABEL_CLASS_NAME,
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
} from "../data-table-chrome";

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

  it("uses zebra fill for unselected pinned cells", () => {
    // Arrange & Act
    const even = dataTableBodyCellClassName({
      isPinnedLeft: true,
      isEvenRow: true,
    });
    const odd = dataTableBodyCellClassName({
      isPinnedLeft: true,
      isEvenRow: false,
    });

    // Assert
    expect(even).toContain("bg-surface-container-low");
    expect(odd).toContain("bg-surface-container-lowest");
    expect(even).not.toContain("bg-accent");
  });

  it("exposes uppercase muted column labels", () => {
    // Arrange & Act
    const className = dataTableColumnLabelClassName("text-right");

    // Assert
    expect(className).toContain(DATA_TABLE_COLUMN_LABEL_CLASS_NAME);
    expect(className).toContain("text-right");
    expect(className).toContain("uppercase");
  });

  it("fills the surface width without collapsing compact columns", () => {
    expect(DATA_TABLE_ELEMENT_CLASS_NAME).toContain("min-w-full");
    expect(DATA_TABLE_ELEMENT_CLASS_NAME).not.toContain("table-fixed");
  });
});
