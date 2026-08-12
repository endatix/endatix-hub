import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { registerMatrixCarouselSchema } from "../infrastructure/registry";
import { registerMatrixCarouselRenderer } from "../infrastructure/matrix-carousel-renderer";
import { bindMatrixCarouselToSurvey } from "../infrastructure/survey-bindings";

// StoragePresignedImage internally calls useAssetStorage(), which throws
// without an <AssetStorageContext.Provider> ancestor. None of this file's
// tests are about asset-storage resolution — mocked the same way
// protected-image.test.tsx mocks it, forwarding the props this file's own
// assertions (className/src/alt) rely on, so tests stay decoupled from
// asset-storage's own render behavior.
vi.mock("@/features/asset-storage/ui/storage-presigned-image", () => ({
  StoragePresignedImage: (props: { src: string; alt?: string; className?: string }) => (
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const observeSpy = vi.fn();
const disconnectSpy = vi.fn();

class IntersectionObserverStub {
  observe(target: Element): void {
    observeSpy(target);
  }
  unobserve(): void {}
  disconnect(): void {
    disconnectSpy();
  }
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
  let previousIntersectionObserver: typeof IntersectionObserver | undefined;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeAll(() => {
    // Unconditional assignment (not ??=), with the previous value saved and
    // restored in afterAll below: ??= would silently skip installing our
    // spy-tracking stubs if jsdom (or some other module loaded earlier in
    // this process) already defined a global IntersectionObserver/
    // ResizeObserver, which would make observeSpy/disconnectSpy — and every
    // test asserting on them — silently exercise nothing.
    previousIntersectionObserver = globalThis.IntersectionObserver;
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.IntersectionObserver =
      IntersectionObserverStub as unknown as typeof IntersectionObserver;
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
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

  afterAll(() => {
    globalThis.IntersectionObserver = previousIntersectionObserver as typeof IntersectionObserver;
    globalThis.ResizeObserver = previousResizeObserver as typeof ResizeObserver;
  });

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    observeSpy.mockClear();
    disconnectSpy.mockClear();
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

  it("shows Next once rows are populated after mount by something other than Next/Previous/swipe (e.g. row-sourcing), not just permanently hidden from the initial 0-row mount", () => {
    // Arrange — starts with zero rows, matching a carry-forward-enabled
    // carousel before its source question has any value: with rows.length
    // === 0, isFirstRow and isLastRow are BOTH true, so the initial
    // componentDidMount sync hides both buttons. Regression test for that
    // exact bug — Next/Previous never reappearing once rows are populated
    // by an external onPropertyChanged("rows"), the same mechanism
    // syncMatrixCarouselRowsFromSource uses. bindMatrixCarouselToSurvey is
    // required here (not just the renderer/schema registration the rest of
    // this file uses) — its own "rows" handler is what busts
    // getMatrixSingleInputQuestions' internal cache via resetSingleInput(),
    // exactly as production wiring does via onModelReady, before this
    // component's own render ever runs.
    const model = new Model(carouselSurveyJson([]));
    const cleanupBindings = bindMatrixCarouselToSurvey(model);
    const { queryByText } = render(<Survey model={model} />);
    expect(queryByText("Next")).toBeNull();

    // Act — mirrors target.rows = newRows in sync-rows-from-source.ts.
    // act() wraps this because it's a raw model mutation outside
    // fireEvent's own auto-wrapping — without it, forceUpdate()'s
    // re-render isn't guaranteed to be flushed before the assertion below.
    const question = model.getQuestionByName("q1");
    act(() => {
      question.rows = [
        { value: "r1", text: "I like coffee" },
        { value: "r2", text: "I like tea" },
      ];
    });

    // Assert
    expect(queryByText("Next")).not.toBeNull();
    cleanupBindings();
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

  it("renders the buttons via a real SurveyActionBar styled with the survey's own theme action-bar classes", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);

    // Assert — sd-action-bar/sd-action, not the unstyled sv- fallback,
    // confirms actionsContainer.cssClasses was set from survey.getCss().actionBar
    expect(container.querySelector(".sd-action-bar")).not.toBeNull();
    expect(container.querySelector(".sd-action[title='Next']")).not.toBeNull();
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
              edxProgressIndicatorType: "bar",
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
      "sv-matrixcarousel__footer sd-paneldynamic__footer",
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
              edxProgressIndicatorType: "bar",
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

  it("falls back to a positional label for an image-only row with no text", () => {
    // Arrange
    const model = new Model(
      carouselSurveyJson([
        { value: "r1", text: "I like coffee" },
        { value: "r2", imageUrl: "https://example.com/img.png" },
      ]),
    );

    // Act
    const { container } = render(<Survey model={model} />);
    const image = container.querySelector(".sv-matrixcarousel__slide-image");

    // Assert
    expect(image?.getAttribute("alt")).toBe("Row 2");
  });

  it("the strip is keyboard-focusable and describes arrow-key navigation via aria-label", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());

    // Act
    const { container } = render(<Survey model={model} />);
    const strip = container.querySelector(".sv-matrixcarousel__strip");

    // Assert
    expect(strip?.getAttribute("tabindex")).toBe("0");
    expect(strip?.getAttribute("aria-label")).toBe(
      "Use arrow keys to move between questions",
    );
  });

  it("ArrowRight fired directly on the strip (not inside a row's own control) advances — regression test for role=group self-matching its own row-control exclusion selector", () => {
    // Arrange — the strip has no role, deliberately: it previously carried
    // role="group", which FOCUSABLE_ROW_CONTROL_SELECTOR also matches (that
    // selector exists to detect focus inside a decomposed checkbox row's own
    // options wrapper, not the strip itself). With role="group" on the strip,
    // target.closest(FOCUSABLE_ROW_CONTROL_SELECTOR) on a keydown fired
    // directly on the strip matched the strip itself, so the handler always
    // bailed out — arrow keys silently did nothing in exactly the one case
    // they're meant to work, since a row's own control focus suppresses the
    // handler for an unrelated, legitimate reason (not stealing that
    // control's native arrow-key semantics).
    const model = new Model(carouselSurveyJson());
    const { container } = render(<Survey model={model} />);
    const strip = container.querySelector(".sv-matrixcarousel__strip") as HTMLElement;
    expect(strip.getAttribute("role")).toBeNull();

    // Act
    fireEvent.keyDown(strip, { key: "ArrowRight", target: strip });

    // Assert
    expect(container.textContent).toContain("2 of 3");
  });

  it("keeps the slide-to-question mapping in sync when a row's visibleIf flips via the survey's condition cascade, not just when rows are reassigned", () => {
    // Arrange — r2 is conditionally visible on a checkbox elsewhere on the
    // page, starting unchecked (hidden). This exercises the survey-wide
    // condition cascade (runItemsCondition -> onRowsChanged()), which never
    // fires question.onPropertyChanged("rows") — only the renderer's own
    // wrapped visibleRowsChangedCallback (installed unconditionally in
    // componentDidMount) catches this trigger, so bindMatrixCarouselToSurvey
    // is deliberately NOT used here to isolate that path.
    const model = new Model({
      pages: [
        {
          elements: [
            { type: "checkbox", name: "toggle", choices: ["show"] },
            {
              type: "matrix",
              name: "q1",
              edxDisplayMode: "carousel",
              columns: [
                { value: "1", text: "Disagree" },
                { value: "2", text: "Agree" },
              ],
              rows: [
                { value: "r1", text: "Row 1" },
                { value: "r2", text: "Row 2", visibleIf: "{toggle} contains 'show'" },
                { value: "r3", text: "Row 3" },
              ],
            },
          ],
        },
      ],
    });
    const { container } = render(<Survey model={model} />);
    expect(container.querySelectorAll(".sv-matrixcarousel__slide")).toHaveLength(2);

    // Act
    act(() => {
      model.setValue("toggle", ["show"]);
    });

    // Assert — a third slide appears, backed by a freshly-decomposed row
    // question rather than a stale 2-row mapping (which would either throw
    // or silently render the wrong row's question in the new slide).
    const slides = container.querySelectorAll(".sv-matrixcarousel__slide");
    expect(slides).toHaveLength(3);
    const radios = container.querySelectorAll(
      '.sv-matrixcarousel__slide input[type="radio"]',
    );
    expect(radios).toHaveLength(6);
  });

  it("refreshes the IntersectionObserver after rows change, so swipe reconciliation doesn't keep watching stale/detached slide nodes", () => {
    // Arrange
    const model = new Model(
      carouselSurveyJson([
        { value: "r1", text: "I like coffee" },
        { value: "r2", text: "I like tea" },
      ]),
    );
    render(<Survey model={model} />);
    expect(observeSpy).toHaveBeenCalledTimes(2);
    observeSpy.mockClear();
    disconnectSpy.mockClear();

    // Act — mirrors row-sourcing repopulating rows at runtime
    const question = model.getQuestionByName("q1");
    act(() => {
      question.rows = [
        { value: "r1", text: "I like coffee" },
        { value: "r2", text: "I like tea" },
        { value: "r3", text: "I like juice" },
      ];
    });

    // Assert — old observer torn down, a fresh one observing all 3 new slides
    expect(disconnectSpy).toHaveBeenCalled();
    expect(observeSpy).toHaveBeenCalledTimes(3);
  });

  it("clears the model's visibleRowsChangedCallback on unmount, so no detached-component closure lingers", () => {
    // Arrange
    const model = new Model(carouselSurveyJson());
    const { unmount } = render(<Survey model={model} />);
    const question = model.getQuestionByName("q1") as unknown as {
      visibleRowsChangedCallback: (() => void) | null;
    };
    expect(question.visibleRowsChangedCallback).not.toBeNull();

    // Act — SurveyQuestionMatrix.prototype.componentWillUnmount (survey-
    // react-ui, called via super.componentWillUnmount() as the first line of
    // our own override) unconditionally nulls this single-slot callback.
    // Our wrapper closure — which holds the captured base callback — is
    // discarded along with it, not left dangling with a reference to the
    // now-unmounted component instance.
    unmount();

    // Assert
    expect(question.visibleRowsChangedCallback).toBeNull();
  });

  it("a remount on the same question installs a fresh callback rather than nesting on top of a stale one", () => {
    // Arrange — unmount then remount on the same underlying question/model,
    // the scenario a stale-callback bug would surface in: if the base
    // callback the first instance captured were still reachable and got
    // wrapped again, resyncMatrixCarouselDecomposition would run twice per
    // rows change and/or reference a detached component's setState.
    const model = new Model(carouselSurveyJson());
    const first = render(<Survey model={model} />);
    first.unmount();
    const { container } = render(<Survey model={model} />);

    // Act
    const question = model.getQuestionByName("q1");
    act(() => {
      question.rows = [
        { value: "r1", text: "I like coffee" },
        { value: "r2", text: "I like tea" },
      ];
    });

    // Assert — exactly one clean set of slides from the current instance
    expect(container.querySelectorAll(".sv-matrixcarousel__slide")).toHaveLength(2);
  });
});
