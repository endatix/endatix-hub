import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { registerMatrixCarouselSchema } from "../infrastructure/registry";
import { registerMatrixCarouselRenderer } from "../infrastructure/matrix-carousel-renderer";

class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// survey-react-ui's own internal Scroll component needs ResizeObserver
// (unrelated to carousel mode) — jsdom doesn't implement it, same stub
// drag-categorize's component test already uses.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const gridSurveyJson = {
  pages: [
    {
      elements: [
        {
          type: "matrix",
          name: "q1",
          columns: [
            { value: "1", text: "Disagree" },
            { value: "2", text: "Agree" },
          ],
          rows: [
            { value: "r1", text: "Row 1" },
            { value: "r2", text: "Row 2" },
          ],
        },
      ],
    },
  ],
};

function carouselSurveyJson(rows: unknown[] = [
  { value: "r1", text: "I like coffee" },
  { value: "r2", text: "I like tea" },
  { value: "r3", text: "I like water", imageUrl: "https://example.com/water.png" },
]) {
  return {
    pages: [
      {
        elements: [
          {
            type: "matrix",
            name: "q1",
            edxDisplayMode: "carousel",
            columns: [
              { value: "1", text: "Disagree" },
              { value: "2", text: "Agree" },
            ],
            rows,
          },
        ],
      },
    ],
  };
}

describe("MatrixCarouselRenderer", () => {
  beforeAll(() => {
    globalThis.IntersectionObserver ??=
      IntersectionObserverStub as unknown as typeof IntersectionObserver;
    globalThis.ResizeObserver ??=
      ResizeObserverStub as unknown as typeof ResizeObserver;
    // jsdom doesn't implement CSS.escape; SurveyJS's focus-first-error path
    // (validate(true, true), triggered when Next is blocked) uses it to
    // build a selector when scrolling/focusing the erroring question — a
    // real-browser behavior with no bearing on carousel logic itself.
    (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS ??= {};
    (globalThis as { CSS: { escape?: (s: string) => string } }).CSS.escape ??=
      (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
    registerMatrixCarouselSchema();
    registerMatrixCarouselRenderer();
  });

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders an ordinary matrix question (no edxDisplayMode) as an unchanged grid table", () => {
    // Arrange
    const model = new Model(gridSurveyJson);

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert — the strip/carousel-only markup must never appear for a plain grid matrix
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector(".sv-matrixcarousel")).toBeNull();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  it("renders a carousel-mode matrix as a strip, one slide per row, not a bare swapped-in radiogroup", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert
    expect(container.querySelector(".sv-matrixcarousel")).not.toBeNull();
    expect(container.querySelector(".sv-matrixcarousel__strip")).not.toBeNull();
    expect(container.querySelectorAll(".sv-matrixcarousel__slide")).toHaveLength(3);
    expect(container.querySelector("table")).toBeNull();
  });

  it("shows the progress indicator as 1 of 3 initially", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert
    expect(container.textContent).toContain("1 of 3");
  });

  it("hides Previous on the first row (not just disables it) and shows Next, matching PanelDynamic's visible-toggle behavior", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { queryByText } = render(<Survey model={model} />);

    // Assert
    expect(queryByText("Previous")).toBeNull();
    expect(queryByText("Next")).not.toBeNull();
  });

  it("shows Previous again once past the first row", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());
    const { getByText, queryByText } = render(<Survey model={model} />);

    // Act
    fireEvent.click(getByText("Next"));

    // Assert
    expect(queryByText("Previous")).not.toBeNull();
  });

  it("Next advances the progress indicator when the current row is not required", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());
    const { getByText, container } = render(<Survey model={model} />);

    // Act
    fireEvent.click(getByText("Next"));

    // Assert
    expect(container.textContent).toContain("2 of 3");
  });

  it("Next is blocked and does not advance when the current row is required and unanswered", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              eachRowRequired: true,
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });
    const { getByText, container } = render(<Survey model={model} />);

    // Act
    fireEvent.click(getByText("Next"));

    // Assert
    expect(container.textContent).toContain("1 of 2");
  });

  it("hides the progress text once the question reports isMobile", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());
    const question = model.getQuestionByName("q1") as unknown as { isMobile: boolean };

    // Act
    question.isMobile = true;
    const { queryByText } = render(<Survey model={model} />);

    // Assert
    expect(queryByText("1 of 3")).toBeNull();
  });

  it("renders the buttons via a real SurveyActionBar, not plain <button> markup", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert
    expect(container.querySelector(".sv-action-bar")).not.toBeNull();
    expect(container.querySelector(".sv-action-bar-item[title='Next']")).not.toBeNull();
  });

  it("lays out progress bar above the content and Back/Next below it, matching PanelDynamic's carousel ordering", () => {
    // Arrange — bar mode, so both the top progress bar and the bottom footer render
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              progressIndicatorType: "bar",
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });

    // Act
    const { container } = render(<Survey model={model} />);
    const root = container.querySelector(".sv-matrixcarousel");
    const childClasses = Array.from(root?.children ?? []).map((el) => el.className);

    // Assert — progress bar first, strip second, footer (with Back/Next) last
    expect(childClasses).toEqual([
      "sv-matrixcarousel__progress",
      "sv-matrixcarousel__strip",
      "sv-matrixcarousel__footer",
    ]);
  });

  it("bar mode shows the bar at the top and does not also show the footer text", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              progressIndicatorType: "bar",
              columns: ["1", "2"],
              rows: ["r1", "r2"],
            },
          ],
        },
      ],
    });

    // Act
    const { container, queryByText } = render(<Survey model={model} />);

    // Assert
    expect(container.querySelector(".sv-matrixcarousel__progress-bar-track")).not.toBeNull();
    expect(queryByText("1 of 2")).toBeNull();
  });

  it("does not trigger a React setState-during-render/commit warning when Next is clicked under StrictMode", () => {
    // Arrange — StrictMode double-invokes render and commit-phase lifecycle
    // methods specifically to surface exactly this class of bug; a plain
    // (non-StrictMode) render did not reproduce a real regression caught in
    // the actual Survey Creator host (componentDidUpdate triggering
    // ActionContainer.flushUpdates(), which nested-updates SurveyActionBar).
    const model = new Model(carouselSurveyJson());
    const { getByText } = render(
      <React.StrictMode>
        <Survey model={model} />
      </React.StrictMode>,
    );

    // Act
    fireEvent.click(getByText("Next"));

    // Assert
    const offendingCalls = consoleErrorSpy.mock.calls.filter((args: unknown[]) =>
      String(args[0]).includes("Cannot update during an existing state transition"),
    );
    expect(offendingCalls).toEqual([]);
  });

  it("renders an image for a row that has one", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);
    const images = container.querySelectorAll(".sv-matrixcarousel__slide-image");

    // Assert
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toBe("https://example.com/water.png");
  });

  it("each slide shares the matrix's columns as its scale", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);
    const radios = container.querySelectorAll('.sv-matrixcarousel__slide input[type="radio"]');

    // Assert — 3 slides x 2 columns each
    expect(radios).toHaveLength(6);
  });
});
