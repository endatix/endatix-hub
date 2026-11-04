import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { Result } from "@/lib/result";
import type { SubmissionTestAccess } from "../submission-test-flag";
import { SubmissionTestAccessProvider } from "../ui/submission-test-access-context";
import { useSubmissionTestMark } from "../ui/use-submission-test-mark.hook";

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const setTest = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/ui/toast", () => ({ toast }));
vi.mock("../submission-test-flag.action", () => ({
  setSubmissionTestAction: setTest,
}));

const CAN_MARK: SubmissionTestAccess = { canMark: true, canDeleteTests: false };

function renderMark(
  row: Partial<SubmissionGridRow>,
  access: SubmissionTestAccess = CAN_MARK,
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SubmissionTestAccessProvider access={access}>
      {children}
    </SubmissionTestAccessProvider>
  );
  const gridRow = { formId: "5", id: "9", ...row } as SubmissionGridRow;
  return renderHook(() => useSubmissionTestMark(gridRow), { wrapper });
}

describe("useSubmissionTestMark", () => {
  it("offers nothing without forms.test", () => {
    // Act
    const { result } = renderMark(
      {},
      { canMark: false, canDeleteTests: false },
    );

    // Assert
    expect(result.current).toBeNull();
  });

  it("marks a real row as test, says so, and reads the rows again", async () => {
    // Arrange
    setTest.mockResolvedValue(Result.success(undefined));
    const { result } = renderMark({ isTestSubmission: false });

    // Act
    act(() => result.current!.mark());

    // Assert
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(result.current!.label).toBe("Mark as test");
    expect(setTest).toHaveBeenCalledWith("5", "9", true);
    expect(toast.success).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Marked as a test submission." }),
    );
  });

  it("links a refused Mark as real to the real submission that blocks it", async () => {
    // Arrange
    setTest.mockResolvedValue(
      Result.error<void>(
        "A submission already exists for this user and form.",
        undefined,
        "submission_exists",
        { statusCode: 409, existingId: "7" },
      ),
    );
    const { result } = renderMark({ isTestSubmission: true });

    // Act
    act(() => result.current!.mark());

    // Assert
    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(setTest).toHaveBeenCalledWith("5", "9", false);
    const shown = toast.error.mock.calls[0][0];
    expect(shown).toMatchObject({
      title: "A submission already exists for this user and form.",
      description: "Mark the submitter's real submission as test first.",
      action: { label: "Open submission" },
    });
    shown.action.onClick();
    expect(router.push).toHaveBeenCalledWith("/forms/5/submissions/7");
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
