import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import type { GridReadinessBanner } from "../grid-readiness";
import { ReadinessBanner } from "../ui/readiness-banner";

const actions = vi.hoisted(() => ({
  prepare: vi.fn(),
  includeInProgress: vi.fn(),
}));
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/export/server", () => ({
  prepareReportingExportAction: actions.prepare,
  refreshIncompleteSubmissionsAction: actions.includeInProgress,
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/ui/toast", () => ({ toast }));

const BANNER: GridReadinessBanner = {
  title: "Some submissions are not prepared",
  lines: [
    "2 submissions completed are not prepared.",
    "1 submission in progress is not included.",
  ],
  showPrepare: true,
  showIncludeInProgress: true,
};

const PREPARED = Result.success({
  formDefinitionId: "3",
  batches: 1,
  processed: 2,
  skipped: 0,
  failed: 0,
});

function renderBanner(banner: Partial<GridReadinessBanner> = {}) {
  render(<ReadinessBanner formId="7" banner={{ ...BANNER, ...banner }} />);
}

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

describe("ReadinessBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the counts and only the actions the banner offers", () => {
    // Act
    renderBanner({ showIncludeInProgress: false });

    // Assert
    expect(
      screen.getByText("2 submissions completed are not prepared."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prepare" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Include in-progress submissions" }),
    ).toBeNull();
  });

  it("prepares the form and reloads the grid", async () => {
    // Arrange
    actions.prepare.mockResolvedValue(PREPARED);
    renderBanner();

    // Act
    await click("Prepare");

    // Assert
    expect(actions.prepare).toHaveBeenCalledWith("7");
    expect(toast.success).toHaveBeenCalledWith("Prepared 2 submissions.");
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("includes in-progress submissions and reloads the grid", async () => {
    // Arrange
    actions.includeInProgress.mockResolvedValue(
      Result.success({ kind: "refreshed", failed: 0, finished: true }),
    );
    renderBanner();

    // Act
    await click("Include in-progress submissions");

    // Assert
    expect(actions.includeInProgress).toHaveBeenCalledWith("7");
    expect(toast.success).toHaveBeenCalledWith(
      "In-progress submissions included.",
    );
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("shows the failure and keeps the grid when prepare fails", async () => {
    // Arrange
    actions.prepare.mockResolvedValue(
      Result.error("Failed to compile export schema."),
    );
    renderBanner();

    // Act
    await click("Prepare");

    // Assert
    expect(toast.error).toHaveBeenCalledWith(
      "Failed to compile export schema.",
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("disables both actions while one runs", async () => {
    // Arrange
    actions.prepare.mockReturnValue(new Promise(() => {}));
    renderBanner();

    // Act
    await click("Prepare");

    // Assert
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
    expect(buttons.map((button) => button.disabled)).toEqual([true, true]);
  });
});
