import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { getRequiredExtensionIds } from "../analyzer";
import type { ExtensionDefinition } from "../../types";
import type { FormAnalyzer } from "../../extension-utils";

function createExtension(
  id: string,
  shouldLoad?: (formJson: unknown, analyzer: FormAnalyzer) => boolean,
): ExtensionDefinition {
  return {
    id,
    type: "question",
    shouldLoad,
    load: vi.fn().mockResolvedValue({}),
  };
}

describe("getRequiredExtensionIds", () => {
  const consoleErrorSpy = vi.spyOn(console, "error");

  beforeEach(() => {
    consoleErrorSpy.mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns empty array when formDefinition is null", () => {
    // Arrange
    const extensions = [createExtension("a")];

    // Act
    const ids = getRequiredExtensionIds(null, extensions);

    // Assert
    expect(ids).toEqual([]);
  });

  it("returns empty array when formDefinition is undefined", () => {
    // Arrange
    const extensions = [createExtension("a")];

    // Act
    const ids = getRequiredExtensionIds(undefined, extensions);

    // Assert
    expect(ids).toEqual([]);
  });

  it("includes extension when shouldLoad is not defined", () => {
    // Arrange – no shouldLoad means “always load”
    const ext = createExtension("always-load");
    delete (ext as Partial<ExtensionDefinition>).shouldLoad;
    const extensions = [ext];
    const form = { pages: [] };

    // Act
    const ids = getRequiredExtensionIds(form, extensions);

    // Assert
    expect(ids).toEqual(["always-load"]);
  });

  it("includes extension when shouldLoad returns true", () => {
    // Arrange
    const extensions = [
      createExtension("included", () => true),
      createExtension("excluded", () => false),
    ];
    const form = { pages: [] };

    // Act
    const ids = getRequiredExtensionIds(form, extensions);

    // Assert
    expect(ids).toEqual(["included"]);
  });

  it("uses analyzer from createFormAnalyzer when shouldLoad uses it", () => {
    // Arrange – getRequiredExtensionIds builds analyzer from form; shouldLoad receives it
    const form = { pages: [{ elements: [{ type: "country", name: "q1" }] }] };
    const extensions = [
      createExtension("country-ext", (_form, analyzer) =>
        analyzer.usesQuestionType("country"),
      ),
      createExtension("text-ext", (_form, analyzer) =>
        analyzer.usesQuestionType("text"),
      ),
    ];

    // Act
    const ids = getRequiredExtensionIds(form, extensions);

    // Assert
    expect(ids).toContain("country-ext");
    expect(ids).not.toContain("text-ext");
  });

  it("excludes extension when shouldLoad returns false", () => {
    // Arrange
    const extensions = [
      createExtension("yes", () => true),
      createExtension("no", () => false),
    ];
    const form = { pages: [] };

    // Act
    const ids = getRequiredExtensionIds(form, extensions);

    // Assert
    expect(ids).toEqual(["yes"]);
  });

  it("catches shouldLoad errors and excludes that extension", () => {
    // Arrange
    const extensions = [
      createExtension("ok", () => true),
      createExtension("throws", () => {
        throw new Error("shouldLoad failed");
      }),
    ];
    const form = { pages: [] };

    // Act
    const ids = getRequiredExtensionIds(form, extensions);

    // Assert
    expect(ids).toEqual(["ok"]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("throws"),
      expect.any(Error),
    );
  });

  it("returns ids in same order as extensions that pass", () => {
    // Arrange
    const extensions = [
      createExtension("a", () => true),
      createExtension("b", () => false),
      createExtension("c", () => true),
    ];
    const form = { pages: [] };

    // Act
    const ids = getRequiredExtensionIds(form, extensions);

    // Assert
    expect(ids).toEqual(["a", "c"]);
  });
});
