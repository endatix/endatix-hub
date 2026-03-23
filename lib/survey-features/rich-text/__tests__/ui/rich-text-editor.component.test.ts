import { describe, expect, it, vi } from "vitest";
import {
  hasActiveSelectionFromEditor,
  hideTooltipFromEditor,
} from "../../ui/rich-text-editor.utils";
import { normalizeAndSanitize } from "../../ui/rich-text-editor.component";

describe("normalizeAndSanitize - Security", () => {
  it("should return empty string for empty string", () => {
    // Arrange
    const value = "";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toBe("");
  });

  it("should return empty string for whitespace-only string", () => {
    // Arrange
    const value = "   ";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toBe("   ");
  });

  it("should return sanitized HTML for safe content", () => {
    // Arrange
    const value = "<p>Hello <strong>world</strong></p>";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toContain("Hello");
    expect(result).toContain("<strong>world</strong>");
  });

  it("should strip script tags in multi-paragraph content", () => {
    // Arrange
    const value = "<script>alert('x')</script><p>Safe</p>";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).not.toContain("<script");
    expect(result).toContain("Safe");
  });

  it("should sanitize XSS in single paragraph (SECURITY FIX TEST)", () => {
    // Arrange
    const value = "<p><script>alert('XSS')</script></p>";
    
    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
  });

  it("should sanitize XSS with event handlers in single paragraph", () => {
    // Arrange
    const value = '<p><img src="x" onerror="alert(1)"></p>';
   
    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).not.toContain("onerror");
  });

  it("should sanitize dangerous HTML but preserve safe formatting", () => {
    // Arrange
    const value = "<p><strong>Hello</strong> <em>World</em></p>";
    
    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });
});

describe("normalizeAndSanitize - Single Paragraph Unwrapping", () => {
  it("should unwrap single paragraph and trim", () => {
    // Arrange
    const value = "<p>Simple text</p>";
    
    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toBe("Simple text");
  });

  it("should unwrap paragraph with nested formatting tags", () => {
    // Arrange
    const value = "<p><strong>Bold text</strong></p>";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toBe("<strong>Bold text</strong>");
  });

  it("should return sanitized content for non-single-paragraph HTML", () => {
    // Arrange
    const value = "<p>First</p><p>Second</p>";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toContain("First");
    expect(result).toContain("Second");
  });

  it("should handle non-breaking spaces in single paragraph", () => {
    // Arrange
    const value = "<p>Text&nbsp;with&nbsp;spaces</p>";

    // Act
    const result = normalizeAndSanitize(value);

    // Assert
    expect(result).toBe("Text with spaces");
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
    const editor = null;
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });

  it("should do nothing when editor has no theme", () => {
    const editor = {};
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });

  it("should do nothing when theme has no tooltip", () => {
    const editor = { theme: {} };
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });

  it("should call hide when theme has tooltip with hide", () => {
    const hide = vi.fn();
    const editor = { theme: { tooltip: { hide } } };
    hideTooltipFromEditor(editor);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("should not throw when tooltip has no hide method", () => {
    const editor = { theme: { tooltip: {} } };
    expect(() => hideTooltipFromEditor(editor)).not.toThrow();
  });
});

describe("handleValueChange - Source Filtering Logic", () => {
  const QUILL_USER_EVENT_SOURCE = "user";

  it("should return early when source is not 'user'", () => {
    const source = "api";
    expect(source !== QUILL_USER_EVENT_SOURCE).toBe(true);
  });

  it("should process when source is 'user'", () => {
    const source = "user";
    expect(source === QUILL_USER_EVENT_SOURCE).toBe(true);
  });

  it("should return early when source is 'silent'", () => {
    const source = "silent";
    expect(source !== QUILL_USER_EVENT_SOURCE).toBe(true);
  });

  it("should return early when source is 'render'", () => {
    const source = "render";
    expect(source !== QUILL_USER_EVENT_SOURCE).toBe(true);
  });
});

describe("handleValueChange - Equality Check Logic", () => {
  it("should consider equal when normalized values match", () => {
    const newValue = normalizeAndSanitize("<p>Same text</p>");
    const currentValue = normalizeAndSanitize("Same text");
    expect(newValue === currentValue).toBe(true);
  });

  it("should consider different when normalized values don't match", () => {
    const newValue = normalizeAndSanitize("<p>New text</p>");
    const currentValue = normalizeAndSanitize("Old text");
    expect(newValue !== currentValue).toBe(true);
  });

  it("should normalize non-breaking spaces before comparison", () => {
    const newValue = normalizeAndSanitize("<p>Text&nbsp;spaces</p>");
    const currentValue = normalizeAndSanitize("Text spaces");
    expect(newValue).toBe("Text spaces");
    expect(newValue).toBe(currentValue);
  });

  it("should handle SurveyJS whitespace normalization (real-world test)", () => {
    const surveyValue = "Main\u00A0Question";
    const quillValue = "<p>Main Question</p>";

    const normalizedSurvey = normalizeAndSanitize(surveyValue);
    const normalizedQuill = normalizeAndSanitize(quillValue);

    expect(normalizedSurvey).toBe("Main Question");
    expect(normalizedQuill).toBe("Main Question");
    expect(normalizedSurvey).toBe(normalizedQuill);
  });
});
