import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCreatorJson } from "../ui/use-creator-json";

function createCreator(initialJson: object | null = null) {
  return { JSON: initialJson };
}

describe("useCreatorJson", () => {
  it("does not overwrite live edits when the same snapshot is refetched", () => {
    // Arrange
    const creator = createCreator();
    const savedJson = { pages: [{ name: "page1", elements: [] }] };

    // Act
    const { rerender } = renderHook(
      ({ json }: { json: object | null }) =>
        useCreatorJson(creator as never, json),
      { initialProps: { json: savedJson } },
    );

    const unsavedJson = {
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
    };
    creator.JSON = unsavedJson;
    rerender({ json: { pages: [{ name: "page1", elements: [] }] } });

    // Assert
    expect(creator.JSON).toBe(unsavedJson);
  });

  it("applies a later distinct snapshot on the same Creator", () => {
    // Arrange
    const creator = createCreator();
    const firstTurn = { pages: [{ name: "page1", elements: [] }] };
    const secondTurn = {
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
    };

    // Act
    const { rerender } = renderHook(
      ({ json }: { json: object | null }) =>
        useCreatorJson(creator as never, json),
      { initialProps: { json: firstTurn } },
    );
    rerender({ json: secondTurn });

    // Assert
    expect(creator.JSON).toBe(secondTurn);
  });

  it("assigns JSON when it arrives after the Creator", () => {
    // Arrange
    const creator = createCreator();
    const json = { pages: [{ name: "page1" }] };

    // Act
    const { rerender } = renderHook(
      ({ json: nextJson }: { json: object | null }) =>
        useCreatorJson(creator as never, nextJson),
      { initialProps: { json: null } },
    );
    rerender({ json });

    // Assert
    expect(creator.JSON).toBe(json);
  });

  it("assigns JSON again when the Creator instance is replaced", () => {
    // Arrange
    const first = createCreator();
    const second = createCreator();
    const json = { pages: [{ name: "page1" }] };

    // Act
    const { rerender } = renderHook(
      ({
        creator,
        json: nextJson,
      }: {
        creator: ReturnType<typeof createCreator>;
        json: object | null;
      }) => useCreatorJson(creator as never, nextJson),
      { initialProps: { creator: first, json } },
    );
    rerender({ creator: second, json });

    // Assert
    expect(first.JSON).toBe(json);
    expect(second.JSON).toBe(json);
  });
});
