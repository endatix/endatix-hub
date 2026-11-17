import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { DataTableColumnLabelReveal } from "../data-table-column-label-reveal";

const LONG_NAME = "brand_awareness_aided_recall_category_grid__Alpha";
const TITLE = "Which brands of {category} do you know?";

function tap(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  fireEvent.click(element);
}

function renderTwoLabels() {
  render(
    <>
      <DataTableColumnLabelReveal label="QAIDED" description={TITLE} />
      <DataTableColumnLabelReveal label={LONG_NAME} description="Other" />
    </>,
  );
  return {
    first: screen.getByRole("button", { name: "QAIDED" }),
    second: screen.getByRole("button", { name: LONG_NAME }),
  };
}

const tooltipText = () => screen.queryByRole("tooltip")?.textContent ?? null;

describe("DataTableColumnLabelReveal", () => {
  beforeEach(() => {
    stubResizeObserver();
  });

  it("reveals the full name in its own case before the description", async () => {
    render(
      <DataTableColumnLabelReveal label={LONG_NAME} description={TITLE} />,
    );

    tap(screen.getByRole("button", { name: LONG_NAME }));

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      `${LONG_NAME} — ${TITLE}`,
    );
  });

  it("closes on a second tap", async () => {
    const { first } = renderTwoLabels();
    tap(first);
    await screen.findByRole("tooltip");

    tap(first);

    await waitFor(() => expect(tooltipText()).toBeNull());
  });

  it("closes on Escape", async () => {
    const { first } = renderTwoLabels();
    tap(first);
    await screen.findByRole("tooltip");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(tooltipText()).toBeNull());
  });

  it("closes on a pointer-down outside", async () => {
    const { first } = renderTwoLabels();
    tap(first);
    await screen.findByRole("tooltip");

    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(tooltipText()).toBeNull());
  });

  it("swaps to a second label's reveal when that label is tapped", async () => {
    const { first, second } = renderTwoLabels();
    tap(first);
    await screen.findByRole("tooltip");

    tap(second);

    await waitFor(() =>
      expect(screen.getAllByRole("tooltip").map((t) => t.textContent)).toEqual([
        `${LONG_NAME} — Other`,
      ]),
    );
  });

  it("toggles on a mouse click", async () => {
    const { first } = renderTwoLabels();
    fireEvent.pointerDown(first, { pointerType: "mouse" });
    fireEvent.click(first);
    await screen.findByRole("tooltip");

    fireEvent.pointerDown(first, { pointerType: "mouse" });
    fireEvent.click(first);

    await waitFor(() => expect(tooltipText()).toBeNull());
  });

  it("toggles on a keyboard click, which has no press before it", async () => {
    const { first } = renderTwoLabels();

    fireEvent.click(first);

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      `QAIDED — ${TITLE}`,
    );
  });

  it("keeps its text across a re-render and shows new text when it changes", async () => {
    const { rerender } = render(
      <DataTableColumnLabelReveal label="QAIDED" description={TITLE} />,
    );
    tap(screen.getByRole("button", { name: "QAIDED" }));
    rerender(<DataTableColumnLabelReveal label="QAIDED" description={TITLE} />);
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      `QAIDED — ${TITLE}`,
    );
    tap(screen.getByRole("button", { name: "QAIDED" }));
    await waitFor(() => expect(tooltipText()).toBeNull());

    rerender(<DataTableColumnLabelReveal label="QB" description="Changed" />);

    tap(screen.getByRole("button", { name: "QB" }));

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "QB — Changed",
    );
  });
});
