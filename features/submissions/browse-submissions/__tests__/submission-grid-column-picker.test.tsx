import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildListSubmissionGridRowsEndpoint } from "@/lib/endatix-api/reporting/submission-grid";
import {
  resolveVisibleAnswerColumns,
  type AnswerColumn,
} from "../submission-grid-columns";
import {
  parseSubmissionGridUrl,
  toSubmissionGridRowsRequest,
} from "../submission-grid-url";
import {
  COLUMN_PICKER_RENDER_LIMIT,
  SubmissionGridColumnPicker,
} from "../ui/submission-grid-column-picker";
import { useSubmissionGridUrl } from "../ui/submission-grid-url-context";

vi.mock("../ui/submission-grid-url-context", () => ({
  useSubmissionGridUrl: vi.fn(),
}));

const updateUrl = vi.fn();

/** Kestrel's default `MaxRequestLineSize`: method, target, version and CRLF. */
const API_REQUEST_LINE_LIMIT = 8192;

function column(
  key: string,
  title: string,
  panelTitle: string | null = null,
): AnswerColumn {
  return {
    key,
    kind: "Simple",
    title,
    questionType: "text",
    filterType: "text",
    placement: { pageName: "page1", pageTitle: "Page one", panelTitle },
  };
}

const catalog = [
  column("q1", "First name"),
  column("q2", "Last name"),
  column("email", "Mail", "Contact"),
  column("phone", "Phone", "Contact"),
];

function renderClosed(
  columns: string | undefined,
  columnsCatalog = catalog,
  isPending = false,
) {
  vi.mocked(useSubmissionGridUrl).mockReturnValue({
    urlState: parseSubmissionGridUrl({ columns }),
    updateUrl,
    isPending,
    textFilters: {},
    setTextFilter: vi.fn(),
  });
  render(
    <SubmissionGridColumnPicker catalog={columnsCatalog} disabled={false} />,
  );
  return screen.getByRole("button", { name: /columns/i });
}

function renderPicker(columns: string | undefined, columnsCatalog = catalog) {
  fireEvent.click(renderClosed(columns, columnsCatalog));
}

function isDisabled(element: HTMLElement): boolean {
  return (element as HTMLButtonElement).disabled;
}

function search(query: string) {
  fireEvent.change(screen.getByRole("textbox", { name: /search columns/i }), {
    target: { value: query },
  });
}

function optionLabels() {
  return screen
    .getAllByRole("checkbox")
    .filter((box) => !box.getAttribute("aria-label"))
    .map((box) => box.closest("label")?.textContent);
}

function apply() {
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
}

describe("SubmissionGridColumnPicker", () => {
  beforeEach(() => {
    updateUrl.mockClear();
  });

  it("groups the columns by page and panel", () => {
    // Act
    renderPicker("q1");

    // Assert
    expect(screen.getByText("Page one")).toBeTruthy();
    expect(screen.getByText("Page one › Contact")).toBeTruthy();
  });

  it("narrows the list to columns matching the search", () => {
    // Arrange
    renderPicker("q1");

    // Act
    search("MAIL");

    // Assert
    expect(optionLabels()).toEqual(["Mailemail"]);
    expect(screen.queryByText("Page one")).toBeNull();
  });

  it("writes the picked columns to the URL on Apply", () => {
    // Arrange
    renderPicker("q1");

    // Act
    fireEvent.click(screen.getByRole("checkbox", { name: /phone/i }));
    apply();

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({ columns: "q1,phone" });
  });

  it("shows a whole group from its heading", () => {
    // Arrange
    renderPicker("q1");

    // Act
    fireEvent.click(
      screen.getByRole("checkbox", { name: /columns in .*contact/i }),
    );
    apply();

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({ columns: "q1,email,phone" });
  });

  it("hides every matching column, but will not apply an empty view", () => {
    // Arrange
    renderPicker("q1,q2");
    search("name");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Hide all" }));

    // Assert
    expect(screen.getByRole("button", { name: "Apply" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByText("Choose at least one column")).toBeTruthy();
  });

  it("goes back to the default view", () => {
    // Arrange
    renderPicker("q2");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Default" }));

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({ columns: null });
  });

  it("draws a bounded list on a 1,000-question form until searched", () => {
    // Arrange
    const large = Array.from({ length: 1000 }, (_, index) =>
      column(`q${index}`, `Question ${index}`),
    );
    renderPicker("q0", large);
    const drawn = optionLabels().length;
    const note = screen.queryByText("800 more columns. Search to find them.");

    // Act
    search("question 99");

    // Assert
    expect(drawn).toBe(COLUMN_PICKER_RENDER_LIMIT);
    expect(note).not.toBeNull();
    expect(optionLabels()).toHaveLength(11);
  });

  it("keeps the rows request within the API's request line on Show all", () => {
    // Arrange
    const large = Array.from({ length: 1000 }, (_, index) => {
      const key = `respondent_answer_${String(index).padStart(4, "0")}`;
      return column(key, `Question ${index}`);
    });
    renderPicker(large[0].key, large);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    apply();

    // Assert
    const urlState = parseSubmissionGridUrl(updateUrl.mock.calls[0][0]);
    const keys = resolveVisibleAnswerColumns(large, urlState.columns).map(
      (visible) => visible.key,
    );
    const target = `/api${buildListSubmissionGridRowsEndpoint(
      "1561761724447588352",
      toSubmissionGridRowsRequest(urlState, keys),
    )}`;
    expect(`GET ${target} HTTP/1.1\r\n`.length).toBeLessThanOrEqual(
      API_REQUEST_LINE_LIMIT,
    );
  });

  it("offers Show all and Hide all only when they change something", () => {
    // Arrange
    renderPicker("q1,q2,email,phone");
    const showAll = screen.getByRole("button", { name: "Show all" });
    const hideAll = screen.getByRole("button", { name: "Hide all" });

    // Act
    fireEvent.click(hideAll);

    // Assert
    expect([isDisabled(showAll), isDisabled(hideAll)]).toEqual([false, true]);
  });

  it("disables a group heading that cannot show more once the view is full", () => {
    // Arrange
    const keys = Array.from({ length: 501 }, (_, index) => `q${index}`);
    const full = keys.map((key, index) =>
      column(key, `Question ${index}`, index === 500 ? "Extra" : null),
    );
    renderPicker(keys.slice(0, 500).join(","), full);
    search("question 500");

    // Act
    const heading = screen.getByRole("checkbox", { name: /extra/i });

    // Assert
    expect(isDisabled(heading)).toBe(true);
    expect(
      isDisabled(screen.getByRole("checkbox", { name: /^Question 500/ })),
    ).toBe(true);
    expect(screen.getByText(/the view is full/i)).toBeTruthy();
  });

  it("cannot be opened while the form has no columns", () => {
    // Act
    const trigger = renderClosed(undefined, []);

    // Assert
    expect(isDisabled(trigger)).toBe(true);
  });

  it("cannot be opened while the grid is applying a change", () => {
    // Act
    const trigger = renderClosed("q1", catalog, true);

    // Assert
    expect(isDisabled(trigger)).toBe(true);
  });

  it("offers Default only when the view is not the default", () => {
    // Act
    renderPicker(undefined);

    // Assert
    expect(isDisabled(screen.getByRole("button", { name: "Default" }))).toBe(
      true,
    );
  });

  it("discards the draft when closed without Apply", () => {
    // Arrange
    const trigger = renderClosed("q1");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("checkbox", { name: /phone/i }));

    // Act
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    fireEvent.click(trigger);

    // Assert
    const phone = screen.getByRole("checkbox", { name: /phone/i });
    expect(phone.getAttribute("data-state")).toBe("unchecked");
    expect(updateUrl).not.toHaveBeenCalled();
  });

  it("keeps Apply off when the draft is back to the grid's columns", () => {
    // Arrange
    renderPicker("q1,q2");
    const q2 = () => screen.getByRole("checkbox", { name: /last name/i });

    // Act
    fireEvent.click(q2());
    fireEvent.click(q2());

    // Assert
    expect(isDisabled(screen.getByRole("button", { name: "Apply" }))).toBe(
      true,
    );
  });
});
