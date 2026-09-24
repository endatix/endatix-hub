import { SubmissionDetailsResult } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Submission } from "@/lib/endatix-api";
import { DEFAULT_CATALOG_LOCALE } from "@/lib/localization";
import { Result } from "@/lib/result";
import { act, render, renderHook, screen } from "@testing-library/react";
import { Suspense } from "react";
import { Model } from "survey-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createLocalStorageMock = () => ({
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  getItemLogger: vi.fn(),
  setItemLogger: vi.fn(),
  key: vi.fn(),
  length: 0,
});

vi.stubGlobal("localStorage", createLocalStorageMock());

import {
  SubmissionDetailsProvider,
  getStoredViewOptions,
  useSubmissionDetails,
  useSubmissionDetailsViewOptions,
} from "../../../ui/details/submission-details-context";
import { getSubmissionDisplayLocale } from "../../../ui/details/submission-display-locale.store";

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
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
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
      const mockModel = new Model({});
      let setSurveyModelFn: ((model: Model | null) => void) | null = null;

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

  describe("label locale", () => {
    const bilingualJson = {
      pages: [
        {
          elements: [
            { type: "text", name: "q1", title: { default: "One", es: "Uno" } },
          ],
        },
      ],
    };
    const spanishSubmission: Submission = {
      ...mockSubmission,
      id: "sub-es",
      metadata: JSON.stringify({ language: "es" }),
    };

    async function renderWithModel(model: Model) {
      let details: ReturnType<typeof useSubmissionDetails> | undefined;
      const Probe = () => {
        details = useSubmissionDetails();
        return null;
      };

      const view = await act(async () =>
        render(
          <Suspense fallback={null}>
            <SubmissionDetailsProvider
              submissionPromise={Promise.resolve(
                Result.success(spanishSubmission),
              )}
            >
              <Probe />
            </SubmissionDetailsProvider>
          </Suspense>,
        ),
      );
      await act(async () => details!.setSurveyModel(model));
      return { view, details: () => details! };
    }

    it("starts in the submitted language and publishes it for the header", async () => {
      const model = new Model(bilingualJson);
      const { details } = await renderWithModel(model);

      expect(details().submittedCatalogLocale).toBe("es");
      expect(details().displayCatalogLocale).toBe("es");
      expect(model.locale).toBe("es");
      expect(getSubmissionDisplayLocale("sub-es")).toEqual({
        catalogLocales: ["default", "es"],
        displayCatalogLocale: "es",
      });
    });

    it("switches labels only to a language the survey has", async () => {
      const model = new Model(bilingualJson);
      const { details } = await renderWithModel(model);

      await act(async () => details().setDisplayCatalogLocale("fr"));
      expect(details().displayCatalogLocale).toBe("es");

      await act(async () =>
        details().setDisplayCatalogLocale(DEFAULT_CATALOG_LOCALE),
      );
      expect(details().displayCatalogLocale).toBe(DEFAULT_CATALOG_LOCALE);
      expect(model.locale).toBe("");
      expect(details().submittedCatalogLocale).toBe("es");
      expect(getSubmissionDisplayLocale("sub-es").displayCatalogLocale).toBe(
        DEFAULT_CATALOG_LOCALE,
      );
    });

    it("clears the published locale when the page unmounts", async () => {
      const { view } = await renderWithModel(new Model(bilingualJson));

      view.unmount();

      expect(getSubmissionDisplayLocale("sub-es").catalogLocales).toEqual([]);
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

      expect(result.current.viewOptions).toEqual({
        showInvisibleItems: true,
        showPersonalizedItems: true,
        showReadOnly: true,
      });
      expect(result.current.updateOption).toBeDefined();
      expect(result.current.toggleOption).toBeDefined();
      expect(result.current.resetOptions).toBeDefined();
    });

    it("should update view option", async () => {
      let updateOptionFn: ((key: any, value: any) => void) | null = null;

      const TestComponent = () => {
        const { viewOptions, updateOption } = useSubmissionDetailsViewOptions();
        updateOptionFn = updateOption;
        return (
          <div data-testid="options">
            {viewOptions.showInvisibleItems ? "true" : "false"}
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
        const { viewOptions, toggleOption } = useSubmissionDetailsViewOptions();
        toggleOptionFn = toggleOption;
        return (
          <div data-testid="options">
            {viewOptions.showInvisibleItems ? "true" : "false"}
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
        const { viewOptions, resetOptions } = useSubmissionDetailsViewOptions();
        resetOptionFn = resetOptions;
        return (
          <div data-testid="options">
            {viewOptions.showInvisibleItems ? "true" : "false"}
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
    it("should save view options to localStorage on change", async () => {
      let updateOptionFn: ((key: any, value: any) => void) | null = null;

      const TestComponent = () => {
        const { viewOptions, updateOption } = useSubmissionDetailsViewOptions();
        updateOptionFn = updateOption;
        return (
          <div data-testid="options">
            {viewOptions.showInvisibleItems.toString()}
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

      expect(vi.mocked(localStorage.setItem)).toHaveBeenCalledWith(
        "SubmissionDetailsViewOptions",
        JSON.stringify({
          showInvisibleItems: false,
          showPersonalizedItems: true,
          showReadOnly: true,
        }),
      );
    });

    it("should load stored view options from localStorage on mount", async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          showInvisibleItems: false,
          showPersonalizedItems: false,
          showReadOnly: false,
        }),
      );

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

      expect(vi.mocked(localStorage.getItem)).toHaveBeenCalledWith(
        "SubmissionDetailsViewOptions",
      );
      expect(result.current.viewOptions).toEqual({
        showInvisibleItems: false,
        showPersonalizedItems: false,
        showReadOnly: false,
      });
    });

    it("should call getStoredViewOptions when localStorage returns invalid data", async () => {
      vi.mocked(localStorage.getItem).mockReturnValue("invalid-json");

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

      expect(vi.mocked(localStorage.getItem)).toHaveBeenCalledWith(
        "SubmissionDetailsViewOptions",
      );
      expect(result.current.viewOptions).toEqual({
        showInvisibleItems: true,
        showPersonalizedItems: true,
        showReadOnly: true,
      });
    });
  });

  describe("getStoredViewOptions", () => {
    it("should return null when window is undefined", () => {
      const originalWindow = globalThis.window;
      vi.stubGlobal("window", undefined);

      const result = getStoredViewOptions();

      expect(result).toBeNull();
      vi.stubGlobal("window", originalWindow);
    });

    it("should return null when localStorage returns null", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const result = getStoredViewOptions();

      expect(result).toBeNull();
    });

    it("should return null when localStorage returns empty string", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("");

      const result = getStoredViewOptions();

      expect(result).toBeNull();
    });

    it("should return parsed view options when valid data exists", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          showInvisibleItems: false,
          showPersonalizedItems: false,
          showReadOnly: false,
        }),
      );

      const result = getStoredViewOptions();

      expect(result).toEqual({
        showInvisibleItems: false,
        showPersonalizedItems: false,
        showReadOnly: false,
      });
    });

    it("should return null when localStorage contains partial data that fails schema validation", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          showInvisibleItems: false,
        }),
      );

      const result = getStoredViewOptions();

      expect(result).toBeNull();
    });

    it("should return null when localStorage contains invalid JSON", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("invalid-json");

      const result = getStoredViewOptions();

      expect(result).toBeNull();
    });

    it("should return null when localStorage contains invalid schema", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          showInvisibleItems: "not-a-boolean",
        }),
      );

      const result = getStoredViewOptions();

      expect(result).toBeNull();
    });
  });
});
