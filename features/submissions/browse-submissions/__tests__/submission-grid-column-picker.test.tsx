import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnswerColumn } from "../submission-grid-columns";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import {
  COLUMN_PICKER_RENDER_LIMIT,
  SubmissionGridColumnPicker,
} from "../ui/submission-grid-column-picker";
import { useSubmissionGridUrl } from "../ui/submission-grid-url-context";

vi.mock("../ui/submission-grid-url-context", () => ({
  useSubmissionGridUrl: vi.fn(),
}));

const updateUrl = vi.fn();

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

function renderPicker(columns: string, columnsCatalog = catalog) {
  vi.mocked(useSubmissionGridUrl).mockReturnValue({
    urlState: parseSubmissionGridUrl({ columns }),
    updateUrl,
    isPending: false,
    textFilters: {},
    setTextFilter: vi.fn(),
  });
  render(
    <SubmissionGridColumnPicker catalog={columnsCatalog} disabled={false} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /columns/i }));
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
      screen.getByRole("checkbox", { name: /show all columns in .*contact/i }),
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
});
