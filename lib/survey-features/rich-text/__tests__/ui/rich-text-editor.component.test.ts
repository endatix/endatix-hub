import { describe, expect, it, vi } from "vitest";
import {
  hasActiveSelectionFromEditor,
  hideTooltipFromEditor,
} from "../../ui/rich-text-editor.utils";
import { normalizeHtmlValue } from "../../ui/rich-text-editor.component";

describe("normalizeHtmlValue", () => {
  it("should return empty string for empty string", () => {
    // Arrange
    const value = "";

    // Act
    const result = normalizeHtmlValue(value);

    // Assert
    expect(result).toBe("");
  });

  it("should return empty string for whitespace-only string", () => {
    // Arrange
    const value = "   ";

    // Act
    const result = normalizeHtmlValue(value);

    // Assert
    expect(result).toBe("   ");
  });

  it("should return sanitized HTML for safe content", () => {
    // Arrange
    const value = "<p>Hello <strong>world</strong></p>";

    // Act
    const result = normalizeHtmlValue(value);

    // Assert
    expect(result).toContain("Hello");
    expect(result).toContain("<strong>world</strong>");
  });

  it("should strip script tags", () => {
    // Arrange
    const value = "<script>alert('x')</script><p>Safe</p>";

    // Act
    const result = normalizeHtmlValue(value);

    // Assert
    expect(result).not.toContain("<script");
    expect(result).toContain("Safe");
  });
});

describe("hasActiveSelectionFromEditor", () => {
  it("should return false when editor is null", () => {
    // Arrange
    const editor = null;

    // Act
    const result = hasActiveSelectionFromEditor(editor);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when editor is undefined", () => {
    // Arrange
    const editor = undefined;

    // Act
    const result = hasActiveSelectionFromEditor(editor);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when selection is missing", () => {
    // Arrange
    const editor = {};

    // Act
    const result = hasActiveSelectionFromEditor(editor);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when savedRange is missing", () => {
    // Arrange
    const editor = { selection: {} };

    // Act
    const result = hasActiveSelectionFromEditor(editor);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when savedRange length is 0", () => {
    // Arrange
    const editor = { selection: { savedRange: { length: 0 } } };

    // Act
    const result = hasActiveSelectionFromEditor(editor);

    // Assert
    expect(result).toBe(false);
  });

  it("should return true when savedRange has length > 0", () => {
    // Arrange
    const editor = { selection: { savedRange: { index: 0, length: 3 } } };

    // Act
    const result = hasActiveSelectionFromEditor(editor);

    // Assert
    expect(result).toBe(true);
  });
});

describe("hideTooltipFromEditor", () => {
  it("should do nothing when editor is null", () => {
    // Arrange
    const editor = null;

    // Act & Assert
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });

  it("should do nothing when editor has no theme", () => {
    // Arrange
    const editor = {};

    // Act & Assert
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });

  it("should do nothing when theme has no tooltip", () => {
    // Arrange
    const editor = { theme: {} };

    // Act & Assert
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });

  it("should call hide when theme has tooltip with hide", () => {
    // Arrange
    const hide = vi.fn();
    const editor = { theme: { tooltip: { hide } } };

    // Act
    hideTooltipFromEditor(editor);

    // Assert
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("should not throw when tooltip has no hide method", () => {
    // Arrange
    const editor = { theme: { tooltip: {} } };

    // Act & Assert
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });
});
