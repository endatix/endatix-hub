import { describe, expect, it } from "vitest";
import { shouldApplyCreatorJson } from "../should-apply-creator-json";

describe("shouldApplyCreatorJson", () => {
  it("applies when the Creator has not received JSON yet", () => {
    // Arrange
    const creator = { id: "creator" };
    const json = { pages: [] };

    // Act & Assert
    expect(shouldApplyCreatorJson(creator, json, null, null)).toBe(true);
  });

  it("skips a new object that is the same snapshot on this Creator", () => {
    // Arrange
    const creator = { id: "creator" };
    const applied = { pages: [{ name: "page1", elements: [] }] };
    const refetched = { pages: [{ name: "page1", elements: [] }] };

    // Act & Assert
    expect(shouldApplyCreatorJson(creator, refetched, creator, applied)).toBe(
      false,
    );
  });

  it("skips a semantically identical snapshot with reordered object keys", () => {
    // Arrange
    const creator = { id: "creator" };
    const applied = {
      title: "Form",
      pages: [{ name: "page1", elements: [] }],
    };
    const refetched = {
      pages: [{ elements: [], name: "page1" }],
      title: "Form",
    };

    // Act & Assert
    expect(shouldApplyCreatorJson(creator, refetched, creator, applied)).toBe(
      false,
    );
  });

  it("applies when array element order differs", () => {
    // Arrange
    const creator = { id: "creator" };
    const applied = { pages: [{ name: "a" }, { name: "b" }] };
    const reorderedPages = { pages: [{ name: "b" }, { name: "a" }] };

    // Act & Assert
    expect(
      shouldApplyCreatorJson(creator, reorderedPages, creator, applied),
    ).toBe(true);
  });

  it("applies a distinct snapshot on the same Creator", () => {
    // Arrange
    const creator = { id: "creator" };
    const applied = { pages: [{ name: "page1", elements: [] }] };
    const nextTurn = {
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
    };

    // Act & Assert
    expect(shouldApplyCreatorJson(creator, nextTurn, creator, applied)).toBe(
      true,
    );
  });

  it("applies again when the Creator instance is replaced", () => {
    // Arrange
    const previous = { id: "old" };
    const next = { id: "new" };
    const json = { pages: [] };

    // Act & Assert
    expect(shouldApplyCreatorJson(next, json, previous, json)).toBe(true);
  });

  it("skips when the Creator or JSON is missing", () => {
    // Arrange
    const creator = { id: "creator" };
    const json = { pages: [] };

    // Act & Assert
    expect(shouldApplyCreatorJson(null, json, null, null)).toBe(false);
    expect(shouldApplyCreatorJson(creator, null, null, null)).toBe(false);
  });
});
