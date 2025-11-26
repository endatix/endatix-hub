import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SurveyComponent from "../survey-component";
import { SurveyModel, CompleteEvent } from "survey-core";
import { ApiResult } from "@/lib/endatix-api";

// --- HOIST MOCK FUNCTIONS ---
// All mock functions must be hoisted so they're available in vi.mock factories
const {
  mockSubmitFormAction,
  mockEnqueueSubmission,
  mockClearQueue,
  mockUseSurveyModel,
} = vi.hoisted(() => ({
  mockSubmitFormAction: vi.fn(),
  mockEnqueueSubmission: vi.fn(),
  mockClearQueue: vi.fn().mockImplementation(() => {
    // This will be called synchronously, so we can add logging if needed
  }),
  mockUseSurveyModel: vi.fn(),
}));

// --- MOCK DEPENDENCIES ---

vi.mock(
  "@/features/public-form/application/actions/submit-form.action",
  () => ({
    submitFormAction: mockSubmitFormAction,
  }),
);

vi.mock("../../application/submission-queue", () => {
  return {
    useSubmissionQueue: vi.fn(() => ({
      enqueueSubmission: mockEnqueueSubmission,
      clearQueue: mockClearQueue,
    })),
  };
});

vi.mock("../use-survey-model.hook", () => ({
  useSurveyModel: (...args: unknown[]) => mockUseSurveyModel(...args),
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: vi.fn(() => ({ trackException: vi.fn() })),
  captureException: vi.fn(),
}));

vi.mock("@/features/storage/hooks/use-blob-storage", () => ({
  useBlobStorage: vi.fn(),
}));

vi.mock("./use-survey-theme.hook", () => ({
  useSurveyTheme: vi.fn(),
}));

vi.mock("./language-selector", () => ({
  LanguageSelector: () => <div>Language Selector</div>,
}));

vi.mock("@/features/recaptcha/infrastructure/recaptcha-client", () => ({
  getReCaptchaToken: vi.fn(() => Promise.resolve("mock-recaptcha-token")),
}));

vi.mock("@/features/recaptcha/recaptcha-config", () => ({
  recaptchaConfig: {
    isReCaptchaEnabled: vi.fn(() => false),
    ACTIONS: { SUBMIT_FORM: "submit_form" },
  },
}));

vi.mock("@/lib/survey-features/rich-text", () => ({
  useRichText: vi.fn(),
}));

vi.mock("../application/use-search-params-variables.hook", () => ({
  useSearchParamsVariables: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
  })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/server", () => ({}));

vi.mock("@/features/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
  ANONYMOUS_SESSION: {},
}));

vi.mock("survey-react-ui", () => ({
  Survey: () => <div data-testid="survey">Survey UI</div>,
}));

vi.mock("@/lib/endatix-api", () => ({
  ApiResult: {
    isSuccess: (result: unknown) => {
      return (
        result !== null &&
        typeof result === "object" &&
        "success" in result &&
        (result as { success: boolean }).success === true
      );
    },
    isError: (result: unknown) => {
      return (
        result !== null &&
        typeof result === "object" &&
        "success" in result &&
        (result as { success: boolean }).success === false
      );
    },
    success: (data: unknown) => ({ success: true, data }),
    networkError: (message?: string) => ({
      success: false,
      error: {
        type: "NetworkError",
        message: message || "Network error",
        errorCode: "NETWORK_ERROR",
      },
    }),
    validationError: (message?: string) => ({
      success: false,
      error: {
        type: "ValidationError",
        message: message || "Validation error",
        errorCode: "VALIDATION_ERROR",
      },
    }),
  },
  Submission: {},
}));

const defaultProps = {
  definition: JSON.stringify({
    pages: [
      {
        elements: [
          {
            type: "text",
            name: "question1",
            title: "Question 1",
          },
        ],
      },
    ],
  }),
  formId: "test-form-123",
  submission: undefined,
  requiresReCaptcha: false,
  isEmbed: false,
};

describe("SurveyComponent - submissionUpdateGuard Behavior", () => {
  let realSurveyModel: SurveyModel;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a REAL SurveyModel instance using the actual SurveyJS library
    realSurveyModel = new SurveyModel(defaultProps.definition);
    realSurveyModel.data = { question1: "test" };
    realSurveyModel.currentPageNo = 0;
    realSurveyModel.showCompletePage = false;

    // Setup default mock return values
    mockSubmitFormAction.mockResolvedValue({
      success: true,
      data: { submissionId: "sub-456" },
    });

    // Ensure useSurveyModel returns our real SurveyModel instance
    mockUseSurveyModel.mockImplementation(() => ({
      surveyModel: realSurveyModel,
      isLoading: false,
      error: null,
    }));
  });

  const fireCompleteEvent = () => {
    const mockEvent = {
      showSaveInProgress: vi.fn(),
      showSaveSuccess: vi.fn(),
      showSaveError: vi.fn(),
    } as unknown as CompleteEvent;
    realSurveyModel.onComplete.fire(realSurveyModel, mockEvent);
    return mockEvent;
  };

  const firePartialUpdate = () => {
    realSurveyModel.setValue("question1", "new value");
  };

  it("should prevent partial updates while a form submission is in progress", async () => {
    // Arrange
    render(<SurveyComponent {...defaultProps} />);

    // Act
    let completeEventMocks!: ReturnType<typeof fireCompleteEvent>;
    await act(async () => {
      completeEventMocks = fireCompleteEvent();
    });

    // Assert
    expect(mockSubmitFormAction).toHaveBeenCalledTimes(1);
    expect(mockClearQueue).toHaveBeenCalledTimes(1);
    expect(completeEventMocks.showSaveInProgress).toHaveBeenCalled();
    
    // Act: Any subsequent partial update should be blocked
    await act(async () => {
      firePartialUpdate();
    });

    // Assert
    expect(mockEnqueueSubmission).not.toHaveBeenCalled();
    await expect(completeEventMocks.showSaveSuccess).toHaveBeenCalled();
   
    // Act: firing another partial update
    await act(async () => {
      firePartialUpdate();
    });

    // Assert
    expect(mockEnqueueSubmission).not.toHaveBeenCalled();
    await expect(completeEventMocks.showSaveSuccess).toHaveBeenCalled();
  });

  it("should reset the guard flag on submission failure", async () => {
    // Arrange
    mockSubmitFormAction.mockResolvedValue(
      ApiResult.networkError("Network error"),
    );
    render(<SurveyComponent {...defaultProps} />);

    // Act
    let completeEventMocks!: ReturnType<typeof fireCompleteEvent>;
    await act(async () => {
      completeEventMocks = fireCompleteEvent();
    });

    // Assert
    await expect(mockSubmitFormAction).toHaveBeenCalledTimes(1);
    await expect(completeEventMocks.showSaveError).toHaveBeenCalledTimes(1);

    // Act: firing a partial update
    await act(async () => {
      firePartialUpdate();
    });

    // Assert
    await expect(mockEnqueueSubmission).toHaveBeenCalledTimes(1);
    const callArgs = mockEnqueueSubmission.mock.calls[0][0];
    expect(callArgs.isComplete).toBe(false);
    expect(JSON.parse(callArgs.jsonData).question1).toBe("new value");
  });

  it("should prevent a second concurrent submission attempt", async () => {
    // Arrange
    render(<SurveyComponent {...defaultProps} />);

    // Act: firing first onComplete - Submission starts, guard is set
    await act(async () => {
      fireCompleteEvent();
    });
    await expect(mockSubmitFormAction).toHaveBeenCalledTimes(1);

    // Act: firing a second onComplete immediately (while first is pending)
    let secondCompleteEventMocks!: ReturnType<typeof fireCompleteEvent>;
    await act(async () => {
      secondCompleteEventMocks = fireCompleteEvent();
    });

    // Assert: that the submission action was NOT called again
    await expect(mockSubmitFormAction).toHaveBeenCalledTimes(1);
    await expect(
      secondCompleteEventMocks.showSaveInProgress,
    ).not.toHaveBeenCalled();
    await expect(mockSubmitFormAction).toHaveBeenCalledTimes(1);
  });
});
