import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { restartTestSubmissionAction } from "@/features/public-form/application/actions/restart-test-submission.action";
import { Result } from "@/lib/result";
import { TestSubmissionBadge } from "../test-submission-badge";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock(
  "@/features/public-form/application/actions/restart-test-submission.action",
  () => ({ restartTestSubmissionAction: vi.fn() }),
);

const START_OVER = { formId: "1", submissionId: "21" };

describe("TestSubmissionBadge", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(restartTestSubmissionAction).mockReset();
  });

  it("says this is a test submission, without Start over by default", () => {
    render(<TestSubmissionBadge />);

    const badge = screen.getByTestId("respondent-test-mode-badge");
    expect(badge.textContent).toContain("You are submitting a test submission");
    expect(badge.getAttribute("aria-label")).toBe("Test submission");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("starts over and reloads the page on the new test submission", async () => {
    vi.mocked(restartTestSubmissionAction).mockResolvedValue(
      Result.success(undefined),
    );
    render(<TestSubmissionBadge startOver={START_OVER} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(restartTestSubmissionAction).toHaveBeenCalledWith("1", "21");
  });

  it("hides Start over and says why when the person was removed", async () => {
    vi.mocked(restartTestSubmissionAction).mockResolvedValue(
      Result.error("Not found", undefined, undefined, { statusCode: 404 }),
    );
    render(<TestSubmissionBadge startOver={START_OVER} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(await screen.findByText(/no longer on this form/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps Start over after another failure so it can be tried again", async () => {
    vi.mocked(restartTestSubmissionAction).mockResolvedValue(
      Result.error("Failed to start over."),
    );
    render(<TestSubmissionBadge startOver={START_OVER} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(await screen.findByText("Failed to start over.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start over" })).toBeTruthy();
  });
});
