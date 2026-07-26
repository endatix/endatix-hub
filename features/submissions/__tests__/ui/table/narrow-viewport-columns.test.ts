import { describe, expect, it } from "vitest";
import {
  NARROW_VIEWPORT_HIDDEN_COLUMN_IDS,
  withNarrowViewportDefaults,
} from "@/features/submissions/ui/table/narrow-viewport-columns";

describe("withNarrowViewportDefaults", () => {
  const visibility = {
    createdAt: true,
    complete: true,
    startedAt: true,
    completedAt: true,
    submitterDisplayId: true,
    completionTime: true,
    status: true,
  };

  it("returns visibility unchanged when not narrow", () => {
    // Arrange & Act
    const result = withNarrowViewportDefaults(visibility, {
      isNarrow: false,
    });

    // Assert
    expect(result).toEqual(visibility);
    expect(result).not.toBe(visibility);
  });

  it("soft-hides Started, Completed, and Time on narrow viewports", () => {
    // Arrange & Act
    const result = withNarrowViewportDefaults(visibility, {
      isNarrow: true,
    });

    // Assert
    for (const columnId of NARROW_VIEWPORT_HIDDEN_COLUMN_IDS) {
      expect(result[columnId]).toBe(false);
    }
    expect(result.createdAt).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.submitterDisplayId).toBe(true);
    expect(result.status).toBe(true);
  });

  it("does not invent columns that are absent from the input map", () => {
    // Arrange
    const partial = { createdAt: true, status: true };

    // Act
    const result = withNarrowViewportDefaults(partial, {
      isNarrow: true,
    });

    // Assert
    expect(result).toEqual(partial);
    expect(result).not.toHaveProperty("startedAt");
  });
});
