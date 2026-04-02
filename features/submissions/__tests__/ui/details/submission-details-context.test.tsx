import { SubmissionDetailsResult } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { act, render, renderHook, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SubmissionDetailsProvider,
  useSubmissionDetails,
  useSubmissionDetailsViewOptions,
} from "../../../ui/details/submission-details-context";

const mockSubmission: Submission = {
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

describe("SubmissionDetailsContext", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    });
  });

  describe("SubmissionDetailsProvider", () => {
    it("should provide submission data when promise resolves successfully", async () => {
      const TestComponent = () => {
        const { submission } = useSubmissionDetails();
        return <div data-testid="submission-id">{submission?.id}</div>;
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      expect(screen.getByTestId("submission-id").textContent).toBe("sub-123");
    });

    it("should render nothing when promise resolves with null", async () => {
      const nullPromise = Promise.resolve<typeof mockSubmissionPromise>(null!);

      const { container } = await act(async () => {
        return render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider submissionPromise={nullPromise}>
              <div data-testid="child">Child content</div>
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      expect(container.textContent).toBe("");
    });

    it("should render nothing when promise resolves with error result", async () => {
      const errorPromise = Promise.resolve(
        Result.error<Submission>("Error loading"),
      );

      const { container } = await act(async () => {
        return render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider submissionPromise={errorPromise}>
              <div data-testid="child">Child content</div>
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      expect(container.textContent).toBe("");
    });

    it("should handle rejected promise gracefully", async () => {
      let rejectFn: ((err: Error) => void) | null = null;
      const rejectedPromise = new Promise<SubmissionDetailsResult>(
        (_, reject) => {
          rejectFn = reject;
        },
      );

      const TestComponent = () => {
        const { submission } = useSubmissionDetails();
        return (
          <div data-testid="submission">
            {submission ? "has submission" : "no submission"}
          </div>
        );
      };

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <SubmissionDetailsProvider submissionPromise={rejectedPromise}>
            <TestComponent />
          </SubmissionDetailsProvider>
        </Suspense>,
      );

      expect(screen.getByText("Loading...")).toBeDefined();

      await act(async () => {
        rejectFn!(new Error("Failed to load"));
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByTestId("submission")).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("useSubmissionDetails", () => {
    it("should return context when used within provider", async () => {
      const { result } = await act(async () => {
        return renderHook(() => useSubmissionDetails(), {
          wrapper: ({ children }) => (
            <Suspense fallback={<div>Loading...</div>}>
              <SubmissionDetailsProvider
                submissionPromise={mockSubmissionPromise}
              >
                {children}
              </SubmissionDetailsProvider>
            </Suspense>
          ),
        });
      });

      expect(result.current.submission).toEqual(mockSubmission);
      expect(result.current.surveyModel).toBeNull();
      expect(result.current.setSurveyModel).toBeDefined();
      expect(result.current.highlightedQuestionName).toBeNull();
      expect(result.current.setHighlightedQuestionName).toBeDefined();
    });

    it("should throw error when used outside provider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSubmissionDetails());
      }).toThrow(
        "useSubmissionDetails hooks must be used within SubmissionDetailsProvider",
      );

      consoleSpy.mockRestore();
    });

    it("should update surveyModel", async () => {
      const mockModel = { get: () => {} } as any;
      let setSurveyModelFn: ((model: any) => void) | null = null;

      const TestComponent = () => {
        const { surveyModel, setSurveyModel } = useSubmissionDetails();
        setSurveyModelFn = setSurveyModel;
        return <div>{surveyModel ? "has model" : "no model"}</div>;
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      await act(async () => {
        setSurveyModelFn!(mockModel);
      });

      const modelElement = screen.getByText("has model");
      expect(modelElement).toBeDefined();
    });

    it("should update highlightedQuestionName", async () => {
      let setHighlightedQuestionFn: ((name: string | null) => void) | null =
        null;

      const TestComponent = () => {
        const { highlightedQuestionName, setHighlightedQuestionName } =
          useSubmissionDetails();
        setHighlightedQuestionFn = setHighlightedQuestionName;
        return (
          <div data-testid="highlight">{highlightedQuestionName || "none"}</div>
        );
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      await act(async () => {
        setHighlightedQuestionFn!("question1");
      });

      expect(screen.getByTestId("highlight").textContent).toBe("question1");
    });
  });

  describe("useSubmissionDetailsViewOptions", () => {
    it("should return view options when used within provider", async () => {
      const { result } = await act(async () => {
        return renderHook(() => useSubmissionDetailsViewOptions(), {
          wrapper: ({ children }) => (
            <Suspense fallback={<div>Loading...</div>}>
              <SubmissionDetailsProvider
                submissionPromise={mockSubmissionPromise}
              >
                {children}
              </SubmissionDetailsProvider>
            </Suspense>
          ),
        });
      });

      expect(result.current.options).toEqual({
        showInvisibleItems: true,
        showPersonalizedItems: true,
        showReadOnly: true,
        useSubmissionLanguage: true,
      });
      expect(result.current.updateOption).toBeDefined();
      expect(result.current.toggleOption).toBeDefined();
      expect(result.current.resetOptions).toBeDefined();
    });

    it("should update view option", async () => {
      let updateOptionFn: ((key: any, value: any) => void) | null = null;

      const TestComponent = () => {
        const { options, updateOption } = useSubmissionDetailsViewOptions();
        updateOptionFn = updateOption;
        return (
          <div data-testid="options">
            {options.showInvisibleItems ? "true" : "false"}
          </div>
        );
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      await act(async () => {
        updateOptionFn!("showInvisibleItems", false);
      });

      expect(screen.getByTestId("options").textContent).toBe("false");
    });

    it("should toggle view option", async () => {
      let toggleOptionFn: ((key: any) => void) | null = null;

      const TestComponent = () => {
        const { options, toggleOption } = useSubmissionDetailsViewOptions();
        toggleOptionFn = toggleOption;
        return (
          <div data-testid="options">
            {options.showInvisibleItems ? "true" : "false"}
          </div>
        );
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      await act(async () => {
        toggleOptionFn!("showInvisibleItems");
      });

      expect(screen.getByTestId("options").textContent).toBe("false");
    });

    it("should reset view options", async () => {
      let resetOptionFn: (() => void) | null = null;

      const TestComponent = () => {
        const { options, resetOptions } = useSubmissionDetailsViewOptions();
        resetOptionFn = resetOptions;
        return (
          <div data-testid="options">
            {options.showInvisibleItems ? "true" : "false"}
          </div>
        );
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      await act(async () => {
        resetOptionFn!();
      });

      expect(screen.getByTestId("options").textContent).toBe("true");
    });

    it("should throw error when used outside provider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSubmissionDetailsViewOptions());
      }).toThrow(
        "useSubmissionDetails hooks must be used within SubmissionDetailsProvider",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("localStorage integration", () => {
    it("should load view options from localStorage on mount", async () => {
      const storedOptions = {
        showInvisibleItems: false,
        showPersonalizedItems: false,
        showReadOnly: false,
        useSubmissionLanguage: false,
      };

      vi.stubGlobal("localStorage", {
        getItem: vi.fn().mockReturnValue(JSON.stringify(storedOptions)),
        setItem: vi.fn(),
      });

      const TestComponent = () => {
        const { options } = useSubmissionDetailsViewOptions();
        return (
          <div data-testid="options">
            {options.showInvisibleItems ? "true" : "false"}
          </div>
        );
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      expect(screen.getByTestId("options").textContent).toBe("false");
    });

    it("should save view options to localStorage on change", async () => {
      const localStorageMock = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      };
      vi.stubGlobal("localStorage", localStorageMock);

      let updateOptionFn: ((key: any, value: any) => void) | null = null;

      const TestComponent = () => {
        const { options, updateOption } = useSubmissionDetailsViewOptions();
        updateOptionFn = updateOption;
        return (
          <div data-testid="options">
            {options.showInvisibleItems.toString()}
          </div>
        );
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <SubmissionDetailsProvider
              submissionPromise={mockSubmissionPromise}
            >
              <TestComponent />
            </SubmissionDetailsProvider>
          </Suspense>,
        );
      });

      await act(async () => {
        updateOptionFn!("showInvisibleItems", false);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "SubmissionDetailsViewOptions",
        JSON.stringify({
          showInvisibleItems: false,
          showPersonalizedItems: true,
          showReadOnly: true,
          useSubmissionLanguage: true,
        }),
      );
    });
  });
});
