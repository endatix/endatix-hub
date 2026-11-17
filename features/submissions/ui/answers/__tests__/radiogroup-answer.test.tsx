import { render, screen } from "@testing-library/react";
import { Model } from "survey-core";
import { describe, expect, it } from "vitest";
import RadioGroupAnswer from "../radiogroup-answer";

function radiogroupPicking(choices: string[], picked: string) {
  const model = new Model({
    elements: [{ type: "radiogroup", name: "q", choices }],
  });
  model.data = { q: picked };
  return model.getQuestionByName("q");
}

describe("RadioGroupAnswer", () => {
  it("shows a picked label that contains a bare percent sign", () => {
    // Arrange
    const question = radiogroupPicking(["50% off", "Free shipping"], "50% off");

    // Act
    render(<RadioGroupAnswer question={question} />);

    // Assert
    expect(screen.getByText("50% off")).not.toBeNull();
  });

  it("still decodes a label written as URI-encoded text", () => {
    // Arrange
    const question = radiogroupPicking(["50%25%20off"], "50%25%20off");

    // Act
    render(<RadioGroupAnswer question={question} />);

    // Assert
    expect(screen.getByText("50% off")).not.toBeNull();
  });
});
