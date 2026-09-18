import React from "react";
import { Model, QuestionCheckboxModel } from "survey-core";
import { describe, expect, it } from "vitest";
import { createPdfThemeStyles } from "../../create-pdf-theme-styles";
import { DEFAULT_PDF_THEME } from "../../pdf-theme";
import PdfCheckboxAnswer from "../answers/pdf-checkbox-answer";

function collectProps(
  node: React.ReactNode,
  predicate: (el: React.ReactElement) => boolean,
): Record<string, unknown>[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectProps(child, predicate));
  }
  if (!React.isValidElement(node)) {
    return [];
  }
  const props = node.props as {
    children?: React.ReactNode;
    name?: string;
    checked?: boolean;
  };
  const self = predicate(node) ? [props as Record<string, unknown>] : [];
  return [...self, ...collectProps(props.children, predicate)];
}

describe("PdfCheckboxAnswer", () => {
  it("emits a checkbox per visible choice; only selected are checked", () => {
    const model = new Model({
      elements: [
        {
          type: "checkbox",
          name: "colors",
          choices: [
            { value: "red", text: "Red" },
            { value: "blue", text: "Blue" },
            { value: "green", text: "Green" },
          ],
        },
      ],
    });
    model.data = { colors: ["blue"] };
    const question = model.getQuestionByName("colors") as QuestionCheckboxModel;
    const themeStyles = createPdfThemeStyles(DEFAULT_PDF_THEME);

    const brochure = PdfCheckboxAnswer({
      question,
      chrome: { themeStyles, fillable: false },
    });
    const brochureText = collectProps(brochure, () => true)
      .flatMap((props) => {
        const children = props.children;
        if (typeof children === "string") {
          return [children];
        }
        if (Array.isArray(children)) {
          return children.filter((c): c is string => typeof c === "string");
        }
        return [];
      })
      .join("");
    expect(brochureText).toContain("[x] Blue");
    expect(brochureText).toContain("[ ] Red");

    const fillable = PdfCheckboxAnswer({
      question,
      chrome: { themeStyles, fillable: true },
    });
    const boxes = collectProps(
      fillable,
      (el) => typeof (el.props as { checked?: unknown }).checked === "boolean",
    );

    expect(boxes).toHaveLength(3);
    expect(boxes.map((box) => box.checked)).toEqual([false, true, false]);
    expect(boxes.every((box) => box.readOnly === false)).toBe(true);
    expect(new Set(boxes.map((box) => box.name)).size).toBe(3);
  });
});
