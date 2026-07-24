import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { DeleteSubmissionDialog } from "../ui/delete-submission-dialog";

const mockDeleteSubmissionAction = vi.fn();
const mockTrackFeatureUsage = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("../delete-submission.action", () => ({
  deleteSubmissionAction: (...args: unknown[]) =>
    mockDeleteSubmissionAction(...args),
}));

vi.mock("@/features/analytics/posthog", () => ({
  useTrackEvent: () => ({
    trackFeatureUsage: mockTrackFeatureUsage,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

describe("DeleteSubmissionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders low-risk copy for test submissions", () => {
    render(
      <DeleteSubmissionDialog
        open
        onOpenChange={vi.fn()}
        formId="form-1"
        submissionId="sub-1"
        isTestSubmission
      />,
    );

    expect(screen.getByText("Delete this test submission?")).toBeDefined();
    expect(
      screen.getByText(/remove the test submission from the grid/i),
    ).toBeDefined();
  });

  it("renders elevated copy for respondent submissions", () => {
    render(
      <DeleteSubmissionDialog
        open
        onOpenChange={vi.fn()}
        formId="form-1"
        submissionId="sub-1"
        isTestSubmission={false}
        submitterId="respondent"
        currentUserId="admin"
      />,
    );

    expect(
      screen.getByText("Delete this respondent submission?"),
    ).toBeDefined();
    expect(
      screen.getByText(/delete a real respondent's submission/i),
    ).toBeDefined();
  });

  it("renders owned copy when submitterDisplayId matches the session user", () => {
    render(
      <DeleteSubmissionDialog
        open
        onOpenChange={vi.fn()}
        formId="form-1"
        submissionId="sub-1"
        isTestSubmission={false}
        submitterId="internal-pk"
        submitterDisplayId="1496113070806663168"
        currentUserId="1496113070806663168"
      />,
    );

    expect(screen.getByText("Delete your submission?")).toBeDefined();
    expect(
      screen.getByText(/remove your submission from the grid/i),
    ).toBeDefined();
  });

  it("deletes, toasts, tracks, and refreshes on success from the grid", async () => {
    mockDeleteSubmissionAction.mockResolvedValueOnce(Result.success("sub-1"));
    const onOpenChange = vi.fn();

    render(
      <DeleteSubmissionDialog
        open
        onOpenChange={onOpenChange}
        formId="form-1"
        submissionId="sub-1"
        isTestSubmission
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockDeleteSubmissionAction).toHaveBeenCalledWith(
        "form-1",
        "sub-1",
      );
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Removed from the list, form counts, and exports.",
        }),
      );
      expect(mockTrackFeatureUsage).toHaveBeenCalledWith(
        "submissions",
        "delete",
        expect.objectContaining({
          form_id: "form-1",
          submission_id: "sub-1",
          is_test: true,
          kind: "test",
          risk: "low",
        }),
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("redirects to the submissions list when redirectToList is set", async () => {
    mockDeleteSubmissionAction.mockResolvedValueOnce(Result.success("sub-1"));

    render(
      <DeleteSubmissionDialog
        open
        onOpenChange={vi.fn()}
        formId="form-1"
        submissionId="sub-1"
        isTestSubmission
        redirectToList
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/forms/form-1/submissions");
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});
