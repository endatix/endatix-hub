import { toast } from "@/components/ui/toast";
import { addSearchKeyAction } from "@/features/submissions/choose-filterable-questions/choose-filterable-questions.action";
import { Result } from "@/lib/result";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnswerColumn,
  ColumnSearchAccess,
} from "../submission-grid-columns";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import {
  COLUMN_PICKER_RENDER_LIMIT,
  SubmissionGridColumnPicker,
} from "../ui/submission-grid-column-picker";
import { useSubmissionGridUrl } from "../ui/submission-grid-url-context";

vi.mock("../ui/submission-grid-url-context", () => ({
  useSubmissionGridUrl: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock(
  "@/features/submissions/choose-filterable-questions/choose-filterable-questions.action",
  () => ({ addSearchKeyAction: vi.fn(), removeSearchKeyAction: vi.fn() }),
);

const updateUrl = vi.fn();
const SLOTS = { used: 53, max: 64, userUsed: 3, userMax: 14 };

function column(
  key: string,
  title: string,
  {
    panelTitle = null,
    search = { state: "ready", source: "auto" },
  }: Partial<{
    panelTitle: string | null;
    search: AnswerColumn["search"];
  }> = {},
): AnswerColumn {
  return {
    key,
    kind: "Simple",
    title,
    questionType: "text",
    filterType: "text",
    search,
    placement: { pageName: "page1", pageTitle: "Page one", panelTitle },
  };
}

const catalog = [
  column("q1", "First name"),
  column("q2", "Last name"),
  column("email", "Mail", { panelTitle: "Contact" }),
  column("phone", "Phone", { panelTitle: "Contact" }),
];

function renderPicker(
  columns: string,
  columnsCatalog = catalog,
  columnSearch: ColumnSearchAccess = { canEdit: false },
) {
  vi.mocked(useSubmissionGridUrl).mockReturnValue({
    urlState: parseSubmissionGridUrl({ columns }),
    updateUrl,
    isPending: false,
    textFilters: {},
    setTextFilter: vi.fn(),
  });
  render(
    <SubmissionGridColumnPicker
      formId="1"
      catalog={columnsCatalog}
      columnSearch={columnSearch}
      disabled={false}
    />,
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

describe("SubmissionGridColumnPicker filterable columns", () => {
  const searchCatalog = [
    column("name", "Name"),
    column("born", "Born", {
      search: { state: "preparing", source: "user" },
    }),
    column("city", "City", { search: { state: "eligible", source: null } }),
    column("notes", "Notes", { search: { state: "ready", source: "user" } }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks filterable and preparing columns but offers no changes without edit", () => {
    // Act
    renderPicker("name", searchCatalog, { canEdit: false, slots: SLOTS });

    // Assert
    expect(screen.getAllByText("Filterable")).toHaveLength(2);
    expect(screen.getByText("Filter preparing")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Make filterable" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /stop filtering/i }),
    ).toBeNull();
    expect(screen.queryByText(/chosen/)).toBeNull();
  });

  it("lets an editor add eligible columns and remove only people's picks", () => {
    // Act
    renderPicker("name", searchCatalog, { canEdit: true, slots: SLOTS });

    // Assert
    expect(
      screen.getAllByRole("button", { name: "Make filterable" }),
    ).toHaveLength(1);
    expect(
      screen
        .getAllByRole("button", { name: /stop filtering/i })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Stop filtering Born", "Stop filtering Notes"]);
    expect(screen.getByText("Filterable: 3 of 14 chosen")).toBeTruthy();
  });

  it("makes a column filterable and reads the columns again", async () => {
    // Arrange
    vi.mocked(addSearchKeyAction).mockResolvedValue(
      Result.success({ formId: "1", keys: [], slots: SLOTS }),
    );
    renderPicker("name", searchCatalog, { canEdit: true, slots: SLOTS });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Make filterable" }));

    // Assert
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(addSearchKeyAction).toHaveBeenCalledWith("1", "city");
    expect(toast.success).toHaveBeenCalledWith(
      '"City" is filterable once its answers are prepared.',
    );
  });

  it("shows the cap message when the 15th pick is refused", async () => {
    // Arrange
    const cap = "A form can have 14 chosen search keys and 64 in all.";
    vi.mocked(addSearchKeyAction).mockResolvedValue(
      Result.validationError(cap, undefined, undefined, { statusCode: 400 }),
    );
    renderPicker("name", searchCatalog, { canEdit: true, slots: SLOTS });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Make filterable" }));

    // Assert
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(cap));
    expect(refresh).not.toHaveBeenCalled();
  });
});
