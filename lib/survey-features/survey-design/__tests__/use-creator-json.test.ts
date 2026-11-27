// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCreatorJson } from "../ui/use-creator-json";
import { SurveyCreatorModel } from "survey-creator-core";
import { conversionSession } from "../../form-diagnostics/conversion-session";

type FakeCreator = { JSON: object | null };
type CreatorJsonProps = { creator: FakeCreator; json: object | null };

const createCreator = (): FakeCreator => ({ JSON: null });

const renderCreatorJson = (initialProps: CreatorJsonProps) =>
  renderHook<void, CreatorJsonProps>(
    ({ creator, json }) => useCreatorJson(creator as never, json),
    { initialProps },
  );

describe("useCreatorJson", () => {
  it("keeps a newer canvas edit when saving a conversion creates a new active version", () => {
    // Arrange
    const creator = new SurveyCreatorModel();
    const json: object = { logo: "data:image/png;base64,iVBORw0KGgo=", pages: [{ name: "p", visible: true }] };
    const { rerender } = renderHook(({ source, id }: { source: object; id: string }) => useCreatorJson(creator, source, id),
      { initialProps: { source: json, id: "1" } });
    const session = conversionSession(creator)!;
    const review = session.review();
    session.uploads.set(review.inventory.files[0].key, "https://storage.example/content/f/1/a.png");
    session.apply(review);
    const submitted = session.prepare(creator.JSON);
    creator.survey.title = "Edited during Save";

    // Act
    rerender({ source: submitted.payload, id: "2" });

    // Assert
    expect(creator.survey.title).toBe("Edited during Save");
    expect(submitted.acknowledge()).toBe(false);
    expect(session.prepare(creator.JSON).payload).toEqual({ ...submitted.payload, title: "Edited during Save" });
    creator.dispose();
  });
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
