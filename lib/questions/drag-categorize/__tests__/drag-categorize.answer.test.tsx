import { render } from "@testing-library/react";
import React from "react";
import { Model } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE } from "../constants";
import { DragCategorizeAnswer } from "../drag-categorize.answer";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

const surveyJson = {
  pages: [
    {
      elements: [
        {
          type: DRAG_CATEGORIZE_TYPE,
          name: "q1",
          choices: [
            { value: "item_1", text: "Item One" },
            { value: "item_2", text: "Item Two", imageUrl: "https://x/2.png" },
            { value: "item_3", text: "Item Three" },
          ],
          zones: [
            { value: "zone_a", text: "Zone A" },
            { value: "zone_b", text: "Zone B" },
          ],
        },
      ],
    },
  ],
};

function renderAnswer(value?: unknown) {
  const model = new Model(surveyJson);
  const question = model.getQuestionByName("q1")!;
  if (value !== undefined) {
    question.value = value;
  }
  return render(<DragCategorizeAnswer question={question} />);
}

describe("DragCategorizeAnswer", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  it("renders every zone with the items placed in it", () => {
    // Act
    const { container } = renderAnswer({
      zone_a: ["item_1", "item_3"],
      zone_b: ["item_2"],
    });

    // Assert
    const text = container.textContent ?? "";
    expect(text).toContain("Zone A");
    expect(text).toContain("Item One");
    expect(text).toContain("Item Three");
    expect(text).toContain("Zone B");
    expect(text).toContain("Item Two");
  });

  it("resolves item labels rather than showing raw values", () => {
    // Act
    const { container } = renderAnswer({ zone_a: ["item_1"] });

    // Assert
    expect(container.textContent).toContain("Item One");
    expect(container.textContent).not.toContain("item_1");
  });

  it("renders item images when present", () => {
    // Act
    const { container } = renderAnswer({ zone_b: ["item_2"] });

    // Assert
    const image = container.querySelector<HTMLImageElement>("img");
    expect(image?.src).toBe("https://x/2.png");
  });

  it("shows zones with no items instead of hiding them", () => {
    // Act
    const { container } = renderAnswer({ zone_a: ["item_1"] });

    // Assert — Zone B stays visible so the reader sees it was left empty
    expect(container.textContent).toContain("Zone B");
  });

  it("renders without a value", () => {
    // Act
    const { container } = renderAnswer();

    // Assert
    expect(container.textContent).toContain("Zone A");
  });

  it("never prints the raw placement JSON", () => {
    // Act
    const { container } = renderAnswer({ zone_a: ["item_1"] });

    // Assert — this is the regression the extension-only design produced
    expect(container.textContent).not.toContain("{");
    expect(container.textContent).not.toContain("[");
  });

  it("shows an image-only item without leaking its internal id", () => {
    // Arrange — no authored label, so ItemValue.text reports the value
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: DRAG_CATEGORIZE_TYPE,
              name: "q1",
              choices: [{ value: "item_1", imageUrl: "https://x/1.png" }],
              zones: [{ value: "zone_a", text: "Zone A" }],
            },
          ],
        },
      ],
    });
    const question = model.getQuestionByName("q1")!;
    question.value = { zone_a: ["item_1"] };

    // Act
    const { container } = render(<DragCategorizeAnswer question={question} />);

    // Assert — the runner hides this id, so the viewer must not print it
    expect(container.querySelector("img")?.src).toBe("https://x/1.png");
    expect(container.textContent).not.toContain("item_1");
  });

  it("still shows answers stored under a zone the form no longer has", () => {
    // Act
    const { container } = renderAnswer({ zone_gone: ["item_1"] });

    // Assert — the form was edited after the response came in
    expect(container.textContent).toContain("zone_gone");
    expect(container.textContent).toContain("Item One");
  });
});
