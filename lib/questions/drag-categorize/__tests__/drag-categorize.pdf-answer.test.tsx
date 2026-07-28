import React from "react";
import { Model } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { DRAG_CATEGORIZE_TYPE } from "../constants";
import PdfDragCategorizeAnswer from "../drag-categorize.pdf-answer";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

/**
 * The PDF primitives cannot be mounted in jsdom, so these assert the element
 * tree the component returns. That is enough to catch the wiring mistakes a
 * shared resolver cannot: a title read off the wrong field, an image dropped,
 * or a caption printed where the runner hides one.
 */
function collectText(node: React.ReactNode): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }
  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }
  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return collectText(props.children);
  }
  return [];
}

function collectImageSources(node: React.ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(collectImageSources);
  if (!React.isValidElement(node)) return [];

  const props = node.props as { src?: string; children?: React.ReactNode };
  return [
    ...(typeof props.src === "string" ? [props.src] : []),
    ...collectImageSources(props.children),
  ];
}

function renderPdfAnswer(questionJson: object, value?: unknown) {
  const model = new Model({
    pages: [{ elements: [{ type: DRAG_CATEGORIZE_TYPE, name: "q1", ...questionJson }] }],
  });
  const question = model.getQuestionByName("q1")!;
  if (value !== undefined) question.value = value;
  return PdfDragCategorizeAnswer({ question });
}

describe("PdfDragCategorizeAnswer", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  it("prints each zone title with the items placed in it", () => {
    // Act
    const tree = renderPdfAnswer(
      {
        choices: [
          { value: "item_1", text: "Item One" },
          { value: "item_2", text: "Item Two" },
        ],
        zones: [
          { value: "zone_a", text: "Zone A" },
          { value: "zone_b", text: "Zone B" },
        ],
      },
      { zone_a: ["item_1"], zone_b: ["item_2"] },
    );

    // Assert
    const text = collectText(tree);
    expect(text).toContain("Zone A");
    expect(text).toContain("Item One");
    expect(text).toContain("Zone B");
    expect(text).toContain("Item Two");
  });

  it("marks an empty zone rather than omitting it", () => {
    // Act
    const tree = renderPdfAnswer(
      {
        choices: [{ value: "item_1", text: "Item One" }],
        zones: [
          { value: "zone_a", text: "Zone A" },
          { value: "zone_b", text: "Zone B" },
        ],
      },
      { zone_a: ["item_1"] },
    );

    // Assert
    expect(collectText(tree)).toContain("No items");
  });

  it("prints an image-only item without leaking its internal id", () => {
    // Act
    const tree = renderPdfAnswer(
      {
        choices: [{ value: "item_1", imageUrl: "https://x/1.png" }],
        zones: [{ value: "zone_a", text: "Zone A" }],
      },
      { zone_a: ["item_1"] },
    );

    // Assert
    expect(collectImageSources(tree)).toEqual(["https://x/1.png"]);
    expect(collectText(tree)).not.toContain("item_1");
  });

  it("keeps answers stored under a zone the form no longer has", () => {
    // Act
    const tree = renderPdfAnswer(
      {
        choices: [{ value: "item_1", text: "Item One" }],
        zones: [{ value: "zone_a", text: "Zone A" }],
      },
      { zone_gone: ["item_1"] },
    );

    // Assert
    const text = collectText(tree);
    expect(text).toContain("zone_gone");
    expect(text).toContain("Item One");
  });

  it("falls back to a placeholder when the question has no zones", () => {
    // Act
    const tree = renderPdfAnswer({ choices: [], zones: [] });

    // Assert
    expect(collectText(tree)).toContain("No answer");
  });
});
