import { fireEvent, render, screen } from "@testing-library/react";
import { Model, Question } from "survey-core";
import { describe, expect, it, vi } from "vitest";
import { QuestionLabel } from "../question-label";

vi.mock("../submission-details-context", () => ({
  ViewOption: { ShowPersonalized: "showPersonalizedItems" },
  useSubmissionDetailsViewOptions: () => ({
    viewOptions: { showPersonalizedItems: true },
  }),
}));

// jsdom has no ResizeObserver; the Radix tooltip measures its content with it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const BRAND_HTML =
  '<img src="https://cdn.example.com/acme.png" style="width:100%; max-width:100px; height:auto;"><p>ACME</p>';

function loopQuestion(): Question {
  const model = new Model({
    elements: [
      {
        type: "checkbox",
        name: "brands",
        choices: [{ value: "acme", text: BRAND_HTML }],
      },
      {
        type: "paneldynamic",
        name: "loop",
        valueName: "brandsLoop",
        templateElements: [
          {
            type: "radiogroup",
            name: "consider",
            title: "How likely are you to {verb} {panel.brand}?",
            choices: ["Might consider", "Would seriously consider"],
          },
        ],
      },
    ],
  });
  model.setVariable("verb", "use / buy");
  model.data = {
    brands: ["acme"],
    brandsLoop: [{ brand: BRAND_HTML, consider: "Might consider" }],
  };
  const panel = model.getQuestionByName("loop") as unknown as {
    panels: Array<{ getQuestionByName(name: string): Question }>;
  };
  return panel.panels[0].getQuestionByName("consider");
}

describe("QuestionLabel", () => {
  it("renders a piped loop title with HTML as one readable block", () => {
    const question = loopQuestion();
    expect(question.processedTitle).not.toBe(question.title);

    const { container } = render(<QuestionLabel forQuestion={question} />);

    const label = container.querySelector("label");
    expect(label?.className).not.toMatch(/\bflex\b/);
    expect(container.textContent).not.toContain("<img");
    expect(container.textContent).not.toContain("<p>");
    expect(container.textContent).toContain("ACME");
    expect(container.querySelectorAll("img[loading=lazy]")).toHaveLength(1);
  });

  it("gives each piped variable its own chip, spaces included", async () => {
    const question = loopQuestion();

    render(<QuestionLabel forQuestion={question} />);

    const chips = screen.getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "use / buy",
      "ACME",
    ]);
    fireEvent.focus(chips[0]);
    expect((await screen.findAllByText("{verb}")).length).toBeGreaterThan(0);
  });

  it("strips script and handlers from a piped value", () => {
    const question = loopQuestion();
    const model = question.survey as unknown as Model;
    model.setVariable(
      "verb",
      '<img src="x" onerror="alert(1)"><script>alert(2)</script>',
    );

    const { container } = render(<QuestionLabel forQuestion={question} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.textContent).not.toContain("<img");
  });
});
