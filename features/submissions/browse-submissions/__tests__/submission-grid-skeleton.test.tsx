import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmissionGridSkeleton } from "../ui/submission-grid-skeleton";

const PREFIX = "brand_awareness_aided_recall_category_grid";

function headerTexts() {
  return screen.getAllByRole("columnheader").map((cell) => cell.textContent);
}

describe("SubmissionGridSkeleton", () => {
  it("heads question columns with their names, cut in the middle", () => {
    // Arrange & Act
    render(
      <SubmissionGridSkeleton
        pageSize={1}
        answers={[
          { label: `${PREFIX}__Alpha`, isQuestionName: true },
          { label: `${PREFIX}__Beta`, isQuestionName: true },
        ]}
      />,
    );

    // Assert
    const tail = screen.getAllByText("__Beta")[0];
    expect(tail.closest(".normal-case")?.textContent).toContain(
      `${PREFIX}__Beta`,
    );
  });

  it("keeps a submitter field's label in the shared style", () => {
    // Arrange & Act
    render(
      <SubmissionGridSkeleton
        pageSize={1}
        answers={[{ label: "Email", isQuestionName: false }]}
      />,
    );

    // Assert
    expect(screen.getByText("Email").className).toContain("uppercase");
  });

  it("shows a repeated label once", () => {
    // Arrange & Act
    render(
      <SubmissionGridSkeleton
        pageSize={1}
        answers={[
          { label: "Email", isQuestionName: false },
          { label: "Email", isQuestionName: false },
        ]}
      />,
    );

    // Assert
    expect(headerTexts().filter((text) => text === "Email")).toHaveLength(1);
  });
});
