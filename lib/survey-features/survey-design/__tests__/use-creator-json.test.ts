// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCreatorJson } from "../ui/use-creator-json";
import { Result } from "@/lib/result/result";

type FakeCreator = { JSON: object | null };
type CreatorJsonProps = { creator: FakeCreator; json: object | null };

const createCreator = (): FakeCreator => ({ JSON: null });

const renderCreatorJson = (initialProps: CreatorJsonProps) =>
  renderHook(
    ({ creator, json }) => useCreatorJson(creator as never, json),
    { initialProps },
  );

describe("useCreatorJson", () => {
  it("does not overwrite live edits when the same snapshot is refetched", () => {
    // Arrange
    const creator = createCreator();
    const savedJson = { pages: [{ name: "page1", elements: [] }] };
    const { rerender } = renderCreatorJson({ creator, json: savedJson });

    // Act
    const unsavedJson = {
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
    };
    creator.JSON = unsavedJson;
    rerender({ creator, json: { pages: [{ name: "page1", elements: [] }] } });

    // Assert
    expect(creator.JSON).toBe(unsavedJson);
  });

  it("does not reset the canvas when a save revalidates the edits back", () => {
    // Arrange
    const creator = createCreator();
    const savedJson = { pages: [{ name: "page1", elements: [] }] };
    const { rerender } = renderCreatorJson({ creator, json: savedJson });

    // Act — the user's edit is saved, then revalidatePath refetches that same content.
    const edited = {
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
    };
    creator.JSON = edited;
    rerender({
      creator,
      json: {
        pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
      },
    });

    // Assert
    expect(creator.JSON).toBe(edited);
  });

  it("applies a later distinct snapshot on the same Creator", () => {
    // Arrange
    const creator = createCreator();
    const firstTurn = { pages: [{ name: "page1", elements: [] }] };
    const secondTurn = {
      pages: [{ name: "page1", elements: [{ type: "text", name: "q1" }] }],
    };
    const { rerender } = renderCreatorJson({ creator, json: firstTurn });

    // Act
    rerender({ creator, json: secondTurn });

    // Assert
    expect(creator.JSON).toBe(secondTurn);
  });

  it("preserves an unsaved edit after the preceding save is read back twice", () => {
    // Arrange
    const creator = createCreator();
    const { rerender } = renderCreatorJson({ creator, json: { title: "Original" } });
    creator.JSON = { title: "Saved" };
    rerender({ creator, json: { title: "Saved" } });
    const draft = { title: "Still editing" };
    creator.JSON = draft;
    // Act
    rerender({ creator, json: { title: "Saved" } });
    // Assert
    expect(creator.JSON).toBe(draft);
  });

  it("preserves a newer canvas edit when its earlier save is first read back", async () => {
    // Arrange
    const creator = createCreator();
    const { rerender, result } = renderCreatorJson({ creator, json: { title: "Original" } });
    creator.JSON = { title: "Saving" };
    await result.current(creator.JSON, async () => Result.success("saved"));
    const draft = { title: "Edited while saving" };
    creator.JSON = draft;
    // Act
    rerender({ creator, json: { title: "Original" } });
    rerender({ creator, json: { title: "Saving" } });
    // Assert
    expect(creator.JSON).toBe(draft);
  });

  it("does not hydrate an echoed JSON-tab submission over a newer editor buffer", async () => {
    // Arrange
    const creator = createCreator();
    const original = { title: "Canvas before JSON edits" };
    const { result, rerender } = renderCreatorJson({ creator, json: original });
    const submitted = { title: "Edited in Ace" };
    const response = Promise.withResolvers<Result<string>>();
    const save = result.current(submitted, () => response.promise);

    // Act — the readback arrives before the action resolves; Ace still owns the draft.
    rerender({ creator, json: { ...submitted } });
    response.resolve(Result.success("saved"));
    await save;

    // Assert
    expect(creator.JSON).toBe(original);
  });

  it.each(["refused", "empty", "threw"])("applies an external definition after its local save %s", async outcome => {
    // Arrange
    const creator = createCreator();
    const { rerender, result } = renderCreatorJson({ creator, json: { title: "Original" } });
    const submitted = { title: "Not saved here" };
    creator.JSON = submitted;
    const refusal = outcome === "refused" ? Result.error("refused") : undefined;
    // Act
    const save = result.current(submitted, async () => {
      if (outcome === "threw") throw new Error("offline");
      return refusal;
    });
    if (outcome === "threw") await expect(save).rejects.toThrow("offline");
    else expect((await save).result).toBe(refusal);
    creator.JSON = { title: "Local draft" };
    rerender({ creator, json: { ...submitted } });
    // Assert
    expect(creator.JSON).toEqual(submitted);
  });

  it("does not cancel a newer pending attempt for the same object when an older save fails", async () => {
    // Arrange
    const creator = createCreator();
    const { rerender, result } = renderCreatorJson({ creator, json: { title: "Original" } });
    const submitted = { title: "Retry" };
    creator.JSON = submitted;
    const older = Promise.withResolvers<Result<string>>();
    const newer = Promise.withResolvers<Result<string>>();
    const first = result.current(submitted, () => older.promise);
    const second = result.current(submitted, () => newer.promise);
    const draft = { title: "Edited during retry" };
    creator.JSON = draft;
    // Act
    older.resolve(Result.error("failed"));
    await first;
    rerender({ creator, json: { ...submitted } });
    newer.resolve(Result.success("saved"));
    // Assert
    expect((await second).stillSaved(Result.success(creator.JSON))).toBe(false);
    expect(creator.JSON).toBe(draft);
  });

  it("assigns JSON when it arrives after the Creator", () => {
    // Arrange
    const creator = createCreator();
    const json = { pages: [{ name: "page1" }] };
    const { rerender } = renderCreatorJson({ creator, json: null });

    // Act
    rerender({ creator, json });

    // Assert
    expect(creator.JSON).toBe(json);
  });

  it("assigns JSON again when the Creator instance is replaced", () => {
    // Arrange
    const first = createCreator();
    const second = createCreator();
    const json = { pages: [{ name: "page1" }] };
    const { rerender } = renderCreatorJson({ creator: first, json });

    // Act
    rerender({ creator: second, json });

    // Assert
    expect(first.JSON).toBe(json);
    expect(second.JSON).toBe(json);
  });
});

describe("useCreatorJson snapshot comparison", () => {
  const rerenderWith = (applied: object, next: object) => {
    const creator = createCreator();
    const { rerender } = renderCreatorJson({ creator, json: applied });
    rerender({ creator, json: next });
    return creator.JSON;
  };

  it("skips a snapshot that differs only by object key order", () => {
    // Act & Assert
    expect(
      rerenderWith(
        { title: "Form", pages: [{ name: "p1", elements: [] }] },
        { pages: [{ elements: [], name: "p1" }], title: "Form" },
      ),
    ).toEqual({ title: "Form", pages: [{ name: "p1", elements: [] }] });
  });

  it("applies a snapshot whose array order changed", () => {
    // Arrange
    const reordered = { pages: [{ name: "b" }, { name: "a" }] };

    // Act & Assert
    expect(
      rerenderWith({ pages: [{ name: "a" }, { name: "b" }] }, reordered),
    ).toBe(reordered);
  });

  it("applies a title edit that only changes letter case", () => {
    // Arrange
    const titleCased = { pages: [{ name: "p1", title: "First Name" }] };

    // Act & Assert
    expect(
      rerenderWith({ pages: [{ name: "p1", title: "first name" }] }, titleCased),
    ).toBe(titleCased);
  });

  it("applies an edit that only retypes a value from string to number", () => {
    // Arrange
    const numeric = { pages: [{ name: "p1", rateMax: 5 }] };

    // Act & Assert
    expect(
      rerenderWith({ pages: [{ name: "p1", rateMax: "5" }] }, numeric),
    ).toBe(numeric);
  });
});
