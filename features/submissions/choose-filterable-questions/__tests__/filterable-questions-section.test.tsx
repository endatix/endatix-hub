import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { Result, type Error as ResultError } from "@/lib/result";
import { removeSearchKeyAction } from "../choose-filterable-questions.action";
import {
  loadFilterableQuestions,
  type FilterableQuestionsLoad,
} from "../load-filterable-questions.server";
import { FilterableQuestionsSection } from "../ui/filterable-questions-section";

vi.mock("../load-filterable-questions.server", () => ({
  loadFilterableQuestions: vi.fn(),
}));
vi.mock("../choose-filterable-questions.action", () => ({
  addSearchKeyAction: vi.fn(),
  removeSearchKeyAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const SLOTS = { used: 51, max: 64, userUsed: 1, userMax: 14 };

function ready(canEdit: boolean): FilterableQuestionsLoad {
  return {
    kind: "ready",
    questions: [
      { key: "name", title: "Name", source: "auto", preparing: false },
      { key: "city", title: "City", source: "user", preparing: false },
    ],
    slots: SLOTS,
    canEdit,
  };
}

async function renderSection(load: FilterableQuestionsLoad) {
  vi.mocked(loadFilterableQuestions).mockResolvedValue(load);
  return render(await FilterableQuestionsSection({ formId: "5" }));
}

describe("FilterableQuestionsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the form's filterable questions once it is ready", async () => {
    // Act
    await renderSection(ready(false));

    // Assert
    expect(
      screen.getByRole("heading", { name: "Filterable questions" }),
    ).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("City")).toBeTruthy();
  });

  it("renders nothing when the form has no filterable questions to show", async () => {
    // Act
    const { container } = await renderSection({ kind: "hidden" });

    // Assert
    expect(container.innerHTML).toBe("");
  });

  it("lets an editor remove their own pick", async () => {
    // Arrange
    vi.mocked(removeSearchKeyAction).mockResolvedValue(
      Result.success({ formId: "5", keys: [], slots: SLOTS }),
    );
    await renderSection(ready(true));

    // Act
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove City from filterable columns",
      }),
    );

    // Assert
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        '"City" is no longer filterable.',
      ),
    );
    expect(removeSearchKeyAction).toHaveBeenCalledWith("5", "city");
    expect(screen.getByText(/add more from the column picker/i)).toBeTruthy();
  });

  it("shows a viewer the list with no actions", async () => {
    // Act
    await renderSection(ready(false));

    // Assert
    expect(
      screen.queryByRole("button", { name: /from filterable columns/i }),
    ).toBeNull();
    expect(screen.queryByText(/add more/i)).toBeNull();
  });

  it("says quietly that the list could not be read, without the API's words", async () => {
    // Arrange
    const load: FilterableQuestionsLoad = {
      kind: "error",
      result: Result.error("Upstream exploded", undefined, undefined, {
        statusCode: 500,
        traceId: "trace-1",
      }) as ResultError,
    };

    // Act
    await renderSection(load);

    // Assert
    const line = screen.getByText(/could not be loaded/i);
    expect(line.className).toContain("text-muted-foreground");
    expect(line.className).not.toContain("text-destructive");
    expect(screen.queryByText("Upstream exploded")).toBeNull();
  });
});
