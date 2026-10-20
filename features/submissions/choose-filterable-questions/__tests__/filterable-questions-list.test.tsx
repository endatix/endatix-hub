import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { removeSearchKeyAction } from "../choose-filterable-questions.action";
import { SEARCH_KEYS_BUSY_MESSAGE } from "@/features/submissions/ui/search-key-outcome";
import { FilterableQuestionsList } from "../ui/filterable-questions-list";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../choose-filterable-questions.action", () => ({
  addSearchKeyAction: vi.fn(),
  removeSearchKeyAction: vi.fn(),
}));

const SLOTS = { used: 52, max: 64, userUsed: 2, userMax: 14 };
const QUESTIONS = [
  { key: "name", title: "Name", source: "auto", preparing: false },
  { key: "city", title: "City", source: "user", preparing: true },
] as const;

function renderList(canEdit: boolean) {
  render(
    <FilterableQuestionsList
      formId="5"
      questions={QUESTIONS}
      slots={SLOTS}
      canEdit={canEdit}
    />,
  );
}

describe("FilterableQuestionsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists automatic and chosen questions with the slots used", () => {
    // Act
    renderList(true);

    // Assert
    expect(screen.getByText("Automatic")).toBeTruthy();
    expect(screen.getByText("Chosen")).toBeTruthy();
    expect(screen.getByText("Preparing")).toBeTruthy();
    expect(screen.getByText(/52 of 64 filterable/)).toBeTruthy();
    expect(screen.getByText(/2 of 14 chosen/)).toBeTruthy();
  });

  it("offers remove on the editor's picks only", () => {
    // Act
    renderList(true);

    // Assert
    expect(
      screen
        .getAllByRole("button", { name: /from filterable columns/i })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Remove City from filterable columns"]);
  });

  it("offers no remove without forms.edit", () => {
    // Act
    renderList(false);

    // Assert
    expect(
      screen.queryByRole("button", { name: /from filterable columns/i }),
    ).toBeNull();
  });

  it("asks to retry when the form was busy", async () => {
    // Arrange
    vi.mocked(removeSearchKeyAction).mockResolvedValue(
      Result.error("Service Unavailable", undefined, undefined, {
        statusCode: 503,
      }),
    );
    renderList(true);

    // Act
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove City from filterable columns",
      }),
    );

    // Assert
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(SEARCH_KEYS_BUSY_MESSAGE),
    );
    expect(removeSearchKeyAction).toHaveBeenCalledWith("5", "city");
    expect(refresh).not.toHaveBeenCalled();
  });
});
