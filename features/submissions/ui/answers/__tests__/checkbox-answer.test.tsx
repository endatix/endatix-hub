import { render, screen } from "@testing-library/react";
import { Model, QuestionCheckboxModel } from "survey-core";
import { describe, expect, it } from "vitest";
import CheckboxAnswer from "../checkbox-answer";

function checkboxPicking(choices: string[], picked: string[]) {
  const model = new Model({
    elements: [{ type: "checkbox", name: "q", choices }],
  });
  model.data = { q: picked };
  return model.getQuestionByName("q") as QuestionCheckboxModel;
}

describe("CheckboxAnswer", () => {
  it("shows a picked label that contains a bare percent sign", () => {
    // Arrange
    const question = checkboxPicking(["50% off", "Free shipping"], ["50% off"]);

    // Act
    render(<CheckboxAnswer question={question} />);

    // Assert
    expect(screen.getByText("50% off")).not.toBeNull();
  });

  it("still decodes a label written as URI-encoded text", () => {
    // Arrange
    const question = checkboxPicking(["50%25%20off"], ["50%25%20off"]);

    // Act
    render(<CheckboxAnswer question={question} />);

    // Assert
    expect(screen.getByText("50% off")).not.toBeNull();
  });
});
