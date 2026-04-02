import { Submission } from "@/lib/endatix-api/submissions/types";
import { Result } from "@/lib/result";
import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionDetailsProvider, useSubmissionDetailsViewOptions } from "../../../ui/details/submission-details-context";
import { SubmissionViewOptions } from "../../../ui/details/submission-view-options";

const mockSubmission : Submission = {
  id: "sub-123",
  status: "completed",
  createdAt: new Date(),
  formId: "form-123",
  formDefinitionId: "form-definition-123",
  isComplete: true,
  jsonData: "{}",
  currentPage: 1,
  metadata: "{}",
  token: "token-123",
  completedAt: new Date(),
};

const mockSubmissionPromise = Promise.resolve(Result.success(mockSubmission));

describe("SubmissionViewOptions", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    });
  });

  it("should render view button", async () => {
    const TestComponent = () => <SubmissionViewOptions />;

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SubmissionDetailsProvider submissionPromise={mockSubmissionPromise}>
            <TestComponent />
          </SubmissionDetailsProvider>
        </Suspense>,
      );
    });

    expect(screen.getByRole("button", { name: /view/i })).toBeDefined();
  });

  it("should use submission details view options hook", async () => {
    const TestComponent = () => {
      const { options } = useSubmissionDetailsViewOptions();
      return (
        <div>
          <span data-testid="showInvisible">{String(options.showInvisibleItems)}</span>
          <span data-testid="showPersonalized">{String(options.showPersonalizedItems)}</span>
          <span data-testid="showReadOnly">{String(options.showReadOnly)}</span>
        </div>
      );
    };

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SubmissionDetailsProvider submissionPromise={mockSubmissionPromise}>
            <TestComponent />
            <SubmissionViewOptions />
          </SubmissionDetailsProvider>
        </Suspense>,
      );
    });

    expect(screen.getByTestId("showInvisible").textContent).toBe("true");
    expect(screen.getByTestId("showPersonalized").textContent).toBe("true");
    expect(screen.getByTestId("showReadOnly").textContent).toBe("true");
  });

  it("should display submission language option when language name is provided", async () => {
    const TestComponent = () => <SubmissionViewOptions submissionLanguageName="English" />;

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SubmissionDetailsProvider submissionPromise={mockSubmissionPromise}>
            <TestComponent />
          </SubmissionDetailsProvider>
        </Suspense>,
      );
    });

    expect(screen.getByRole("button", { name: /view/i })).toBeDefined();
  });

  it("should render without submission language when not provided", async () => {
    const TestComponent = () => <SubmissionViewOptions />;

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SubmissionDetailsProvider submissionPromise={mockSubmissionPromise}>
            <TestComponent />
          </SubmissionDetailsProvider>
        </Suspense>,
      );
    });

    expect(screen.getByRole("button", { name: /view/i })).toBeDefined();
  });
});