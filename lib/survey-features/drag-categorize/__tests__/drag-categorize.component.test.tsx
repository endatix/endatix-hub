import { act, render } from "@testing-library/react";
import React from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { beforeAll, describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE, POOL_ZONE_ID } from "../constants";
import { registerDragCategorizeComponent } from "../infrastructure/drag-categorize.component";
import { registerDragCategorizeGlobals } from "../infrastructure/registry";

const surveyJson = {
  pages: [
    {
      elements: [
        {
          type: DRAG_CATEGORIZE_TYPE,
          name: "q1",
          choices: [
            { value: "item_1", text: "Item 1" },
            { value: "item_2", text: "Item 2", imageUrl: "https://x/2.png" },
          ],
          zones: [
            { value: "zone_a", text: "Zone A" },
            { value: "zone_b", text: "Zone B", minItems: 1, maxItems: 2 },
          ],
        },
      ],
    },
  ],
};

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe("DragCategorizeComponent", () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??=
      ResizeObserverStub as unknown as typeof ResizeObserver;
    registerDragCategorizeGlobals();
    registerDragCategorizeComponent();
  });

  it("renders the pool and every zone as drop targets", () => {
    // Arrange
    const model = new Model(surveyJson);

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert
    const pool = container.querySelector(
      `[data-categorize="${POOL_ZONE_ID}"]`,
    );
    expect(pool).not.toBeNull();
    expect(pool?.querySelectorAll("[data-categorize-item]")).toHaveLength(2);
    expect(container.querySelector('[data-categorize="zone_a"]')).not.toBeNull();
    expect(container.querySelector('[data-categorize="zone_b"]')).not.toBeNull();
    expect(container.textContent).toContain("Zone A");
    expect(container.textContent).toContain("Min 1 · Max 2");
  });

  it("renders image items as images and text items as chips", () => {
    // Arrange
    const model = new Model(surveyJson);

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert
    const image = container.querySelector<HTMLImageElement>(
      ".sv-categorize__item-img",
    );
    expect(image?.src).toBe("https://x/2.png");
    expect(container.textContent).toContain("Item 1");
  });

  it("moves chips into zones when the value changes", () => {
    // Arrange
    const model = new Model(surveyJson);
    const { container } = render(<Survey model={model} />);

    // Act
    act(() => {
      model.getQuestionByName("q1")!.value = { zone_a: ["item_1"] };
    });

    // Assert
    const zoneA = container.querySelector('[data-categorize="zone_a"]');
    expect(
      zoneA?.querySelector('[data-categorize-item="item_1"]'),
    ).not.toBeNull();
    const pool = container.querySelector(
      `[data-categorize="${POOL_ZONE_ID}"]`,
    );
    expect(pool?.querySelector('[data-categorize-item="item_1"]')).toBeNull();
  });

  it("shows a clickable add-item ghost chip in design mode only", () => {
    // Arrange — design mode must be set before the JSON loads (as the
    // Creator does) for SurveyJS to append the ghost "newitem" placeholder.
    const designModel = new Model();
    designModel.setDesignMode(true);
    designModel.fromJSON(surveyJson);
    const runtimeModel = new Model(surveyJson);

    // Act
    const design = render(<Survey model={designModel} />);
    const runtime = render(<Survey model={runtimeModel} />);
    const ghost = design.container.querySelector<HTMLElement>(
      ".sv-categorize__item--ghost",
    );
    act(() => {
      ghost?.click();
    });

    // Assert
    expect(ghost).not.toBeNull();
    expect(
      runtime.container.querySelector(".sv-categorize__item--ghost"),
    ).toBeNull();
    expect(
      designModel.getQuestionByName("q1")!.choices.map((c: any) => c.value),
    ).toContain("item3");
  });

  it("renders statically in display mode without pointer handlers", () => {
    // Arrange
    const model = new Model(surveyJson);
    model.data = { q1: { zone_b: ["item_2"] } };
    model.mode = "display";

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert
    const zoneB = container.querySelector('[data-categorize="zone_b"]');
    expect(
      zoneB?.querySelector('[data-categorize-item="item_2"]'),
    ).not.toBeNull();
  });
});
