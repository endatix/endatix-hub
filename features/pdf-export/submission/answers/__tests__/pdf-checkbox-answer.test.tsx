import React from "react";
import { Model, QuestionCheckboxModel } from "survey-core";
import { describe, expect, it } from "vitest";
import PdfCheckboxAnswer from "../pdf-checkbox-answer";

/**
 * The PDF primitives cannot be mounted in jsdom, so these assert the text in
 * the element tree the component returns.
 */
function collectText(node: React.ReactNode): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }
  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectText(child));
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return collectText(props.children);
  }
  return [];
}

function checkboxPicking(choices: string[], picked: string[]) {
  const model = new Model({
    elements: [{ type: "checkbox", name: "q", choices }],
  });
  model.data = { q: picked };
  return model.getQuestionByName("q") as QuestionCheckboxModel;
}

describe("PdfCheckboxAnswer", () => {
  it("prints a picked label that contains a bare percent sign", () => {
    // Arrange
    const question = checkboxPicking(["50% off", "Free shipping"], ["50% off"]);

    // Act
    const tree = PdfCheckboxAnswer({ question });

    // Assert
    expect(collectText(tree)).toContain("50% off");
  });

  it("still decodes a label written as URI-encoded text", () => {
    // Arrange
    const question = checkboxPicking(["50%25%20off"], ["50%25%20off"]);

    // Act
    const tree = PdfCheckboxAnswer({ question });

    // Assert
    expect(collectText(tree)).toContain("50% off");
  });
});
