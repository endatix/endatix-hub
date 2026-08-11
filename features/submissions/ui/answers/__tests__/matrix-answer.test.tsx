import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatrixAnswer from "../matrix-answer";

describe("MatrixAnswer", () => {
  it("shows a row with authored text as before", () => {
    // Arrange
    const question = {
      title: "q1",
      columns: [{ value: 1, text: "Agree" }],
      rows: [{ value: "r1", text: "I like coffee", getType: () => "itemvalue" }] as never,
      value: { r1: 1 },
    };

    // Act
    render(<MatrixAnswer question={question as never} />);

    // Assert
    expect(screen.getByText("I like coffee")).not.toBeNull();
    expect(screen.getByText("Agree")).not.toBeNull();
  });

  it("falls back to a positional label for an image-only row instead of dropping it", () => {
    // Arrange — a matrix-carousel row with no authored text, only an image
    const question = {
      title: "q1",
      columns: [{ value: 1, text: "Agree" }],
      rows: [
        { value: "r1", text: "", imageUrl: "https://example.com/a.png", getType: () => "itemvalue" },
      ] as never,
      value: { r1: 1 },
    };

    // Act
    render(<MatrixAnswer question={question as never} />);

    // Assert — previously this row was silently dropped entirely
    expect(screen.getByText("Row 1")).not.toBeNull();
    expect(screen.getByText("Agree")).not.toBeNull();
  });

  it("still shows no-answer state when there is truly nothing to show", () => {
    // Arrange
    const question = {
      title: "q1",
      columns: [{ value: 1, text: "Agree" }],
      rows: [{ value: "r1", text: "Unanswered row", getType: () => "itemvalue" }] as never,
      value: undefined,
    };

    // Act
    render(<MatrixAnswer question={question as never} />);

    // Assert
    expect(screen.getByText("No answer")).not.toBeNull();
  });
});
