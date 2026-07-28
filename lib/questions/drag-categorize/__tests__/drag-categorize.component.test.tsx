import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DRAG_CATEGORIZE_TYPE, POOL_ZONE_ID } from "../constants";
import { registerDragCategorizeQuestion } from "../drag-categorize.component";
import type { DragCategorizeQuestion } from "../drag-categorize.model";

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
    registerDragCategorizeQuestion();
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

  it("exposes the configured zone width to the grid layout", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: DRAG_CATEGORIZE_TYPE,
              name: "q1",
              choices: ["item_1"],
              zones: [{ value: "zone_a" }, { value: "zone_b" }],
              zoneMinWidth: 240,
            },
          ],
        },
      ],
    });

    // Act
    const { container } = render(<Survey model={model} />);
    const zones = container.querySelector<HTMLElement>(
      ".sv-categorize__zones",
    );

    // Assert
    expect(
      zones?.style.getPropertyValue("--sv-categorize-zone-min-width"),
    ).toBe("240px");
  });

  it("falls back to the 180px default zone width", () => {
    // Arrange
    const model = new Model(surveyJson);

    // Act
    const { container } = render(<Survey model={model} />);
    const zones = container.querySelector<HTMLElement>(
      ".sv-categorize__zones",
    );

    // Assert
    expect(
      zones?.style.getPropertyValue("--sv-categorize-zone-min-width"),
    ).toBe("180px");
  });

  describe("image captions", () => {
    function renderWithItems(
      items: Record<string, unknown>[],
      questionProps: Record<string, unknown> = {},
    ) {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: DRAG_CATEGORIZE_TYPE,
                name: "q1",
                choices: items,
                zones: [{ value: "zone_a" }, { value: "zone_b" }],
                ...questionProps,
              },
            ],
          },
        ],
      });
      return render(<Survey model={model} />);
    }

    it("shows the authored label under an image", () => {
      // Act
      const { container } = renderWithItems([
        { value: "item_1", text: "Golden retriever", imageUrl: "https://x/1.png" },
      ]);

      // Assert
      expect(container.textContent).toContain("Golden retriever");
      expect(
        container.querySelector(".sv-categorize__item-content--captioned"),
      ).not.toBeNull();
    });

    it("uses the label as alt text", () => {
      // Act
      const { container } = renderWithItems([
        { value: "item_1", text: "Golden retriever", imageUrl: "https://x/1.png" },
      ]);

      // Assert
      const image = container.querySelector<HTMLImageElement>("img");
      expect(image?.alt).toBe("Golden retriever");
    });

    it("renders no caption and empty alt when no label was authored", () => {
      // Arrange — SurveyJS reports text as "item_1" here, which must not leak
      // Act
      const { container } = renderWithItems([
        { value: "item_1", imageUrl: "https://x/1.png" },
      ]);

      // Assert
      const image = container.querySelector<HTMLImageElement>("img");
      expect(image?.alt).toBe("");
      expect(container.textContent).not.toContain("item_1");
      expect(
        container.querySelector(".sv-categorize__item-content--captioned"),
      ).toBeNull();
    });

    it("hides captions when showItemLabels is off", () => {
      // Act
      const { container } = renderWithItems(
        [
          {
            value: "item_1",
            text: "Golden retriever",
            imageUrl: "https://x/1.png",
          },
        ],
        { showItemLabels: false },
      );

      // Assert
      expect(container.textContent).not.toContain("Golden retriever");
      expect(
        container.querySelector(".sv-categorize__item-content--captioned"),
      ).toBeNull();
    });

    it("still shows text for items without an image when labels are off", () => {
      // Act
      const { container } = renderWithItems(
        [{ value: "item_1", text: "Plain item" }],
        { showItemLabels: false },
      );

      // Assert — the setting governs captions under images, not text items
      expect(container.textContent).toContain("Plain item");
    });
  });

  describe("reacting to definition edits on the design surface", () => {
    // The Creator edits items and zones through the property grid, which
    // mutates ItemValue properties rather than the question's own. Nothing
    // re-renders the canvas afterwards, so the component has to subscribe to
    // those objects itself.
    function renderDesigner() {
      const model = new Model(surveyJson);
      const question = model.getQuestionByName(
        "q1",
      ) as unknown as DragCategorizeQuestion;
      const { container } = render(<Survey model={model} />);
      return { container, question };
    }

    it("shows an image as soon as it is set on a choice", () => {
      // Arrange
      const { container, question } = renderDesigner();
      const item = question.choices.find((c) => c.value === "item_1")!;

      // Act
      act(() => {
        item.imageUrl = "https://x/new.png";
      });

      // Assert
      const sources = Array.from(
        container.querySelectorAll<HTMLImageElement>("img"),
      ).map((img) => img.src);
      expect(sources).toContain("https://x/new.png");
    });

    it("shows a renamed item label right away", () => {
      // Arrange
      const { container, question } = renderDesigner();
      const item = question.choices.find((c) => c.value === "item_1")!;

      // Act
      act(() => {
        item.text = "Renamed item";
      });

      // Assert
      expect(container.textContent).toContain("Renamed item");
    });

    it("shows a renamed zone title right away", () => {
      // Arrange
      const { container, question } = renderDesigner();

      // Act
      act(() => {
        question.zones[0].text = "Renamed zone";
      });

      // Assert
      expect(container.textContent).toContain("Renamed zone");
    });

    it("falls back to the zone id when no title was authored", () => {
      // Arrange — the Creator names new zones zone1..zoneN with no title
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: DRAG_CATEGORIZE_TYPE,
                name: "q1",
                choices: [{ value: "item_1" }],
                zones: [{ value: "zone_a" }, { value: "zone_b" }],
              },
            ],
          },
        ],
      });

      // Act
      const { container } = render(<Survey model={model} />);

      // Assert
      const title = container.querySelector(
        '[data-categorize="zone_a"] .sv-categorize__zone-title',
      );
      expect(title?.textContent).toBe("zone_a");
    });

    it("shows a zone capacity change right away", () => {
      // Arrange
      const { container, question } = renderDesigner();

      // Act
      act(() => {
        question.zones[0].maxItems = 3;
      });

      // Assert
      expect(container.textContent).toContain("Max 3");
    });
  });

  describe("display mode", () => {
    function renderInMode(mode: "display" | "edit") {
      const model = new Model(surveyJson);
      model.data = { q1: { zone_b: ["item_2"] } };
      model.mode = mode;
      const question = model.getQuestionByName(
        "q1",
      ) as unknown as DragCategorizeQuestion;
      const onPointerDown = vi.spyOn(question, "handlePointerDown");
      const { container } = render(<Survey model={model} />);
      const chip = container.querySelector<HTMLElement>(
        '[data-categorize="zone_b"] [data-categorize-item="item_2"]',
      );
      return { chip, onPointerDown };
    }

    it("still renders the placement", () => {
      // Act
      const { chip } = renderInMode("display");

      // Assert
      expect(chip).not.toBeNull();
    });

    it("does not wire a pointer handler to the chips", () => {
      // Arrange
      const { chip, onPointerDown } = renderInMode("display");

      // Act
      fireEvent.pointerDown(chip!);

      // Assert
      expect(onPointerDown).not.toHaveBeenCalled();
    });

    it("wires one in edit mode, so the check above can tell the difference", () => {
      // Arrange
      const { chip, onPointerDown } = renderInMode("edit");

      // Act
      fireEvent.pointerDown(chip!);

      // Assert
      expect(onPointerDown).toHaveBeenCalledTimes(1);
    });
  });
});
