import { render, screen } from "@testing-library/react";
import { Model, QuestionCheckboxModel } from "survey-core";
import { describe, expect, it } from "vitest";
import CheckboxAnswer from "../checkbox-answer";

const HTML_LABEL =
  '<div style="width:100%"><img src="https://cdn.example.com/brand%20b.png"> Brand B</div>';

function checkboxPicking(
  choices: Array<string | { value: string; text: string }>,
  picked: string[],
) {
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

  it("shows a label with percent-escapes exactly as written", () => {
    // Arrange
    const question = checkboxPicking(["100%25 cotton"], ["100%25 cotton"]);

    // Act
    render(<CheckboxAnswer question={question} />);

    // Assert
    expect(screen.getByText("100%25 cotton")).not.toBeNull();
  });

  it("shows only the visible text of an HTML label with % in its markup", () => {
    // Arrange
    const question = checkboxPicking([{ value: "b", text: HTML_LABEL }], ["b"]);

    // Act
    const { container } = render(<CheckboxAnswer question={question} />);

    // Assert
    expect(screen.getByText("Brand B")).not.toBeNull();
    expect(container.textContent).not.toMatch(/[%<]/);
  });
});
