import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SurveyComponent from "../survey-component";
import { SurveyModel, CompleteEvent } from "survey-core";
import { ApiResult } from "@/lib/endatix-api";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";

// --- HOIST MOCK FUNCTIONS ---
// All mock functions must be hoisted so they're available in vi.mock factories
const {
  mockSubmitPublicForm,
  mockEnqueueSubmission,
  mockClearQueue,
  mockWaitForInFlightPartial,
  mockUseSurveyModel,
  mockSendEmbedMessage,
  mockEmbedHeightReporting,
} = vi.hoisted(() => ({
  mockSubmitPublicForm: vi.fn(),
  mockEnqueueSubmission: vi.fn(),
  mockClearQueue: vi.fn().mockImplementation(() => {
    // This will be called synchronously, so we can add logging if needed
  }),
  mockWaitForInFlightPartial: vi.fn().mockResolvedValue(undefined),
  mockUseSurveyModel: vi.fn(),
  mockSendEmbedMessage: vi.fn(),
  mockEmbedHeightReporting: {
    freeze: vi.fn(),
    resume: vi.fn(),
    isFrozen: vi.fn(() => false),
  },
}));

// --- MOCK DEPENDENCIES ---

vi.mock("@/features/public-form/application/submit-public-form", () => ({
  submitPublicForm: mockSubmitPublicForm,
}));

vi.mock("../../application/submission-queue", () => {
  return {
    useSubmissionQueue: vi.fn(() => ({
      enqueueSubmission: mockEnqueueSubmission,
      clearQueue: mockClearQueue,
      waitForInFlightPartial: mockWaitForInFlightPartial,
    })),
  };
});

vi.mock("../use-survey-model.hook", () => ({
  useSurveyModel: (...args: unknown[]) => mockUseSurveyModel(...args),
}));

vi.mock("@/features/embed-form", () => ({
  embedHeightReporting: mockEmbedHeightReporting,
  useSurveyEmbedBehavior: vi.fn(() => ({
    sendEmbedMessage: mockSendEmbedMessage,
    registerEmbedHandlers: vi.fn(() => () => {}),
  })),
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: vi.fn(() => ({ trackException: vi.fn() })),
  captureException: vi.fn(),
}));

vi.mock("@/features/asset-storage/client", () => ({
  useStorageWithSurvey: vi.fn(() => ({
    registerStorageHandlers: vi.fn(() => () => {}),
    isStorageReady: true,
  })),
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

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

vi.mock("@/lib/endatix-api/public/forms/form-access-token.client", () => ({
  buildFormAccessTokenBody: vi.fn(() => ({})),
  createFormAccessToken: vi.fn().mockResolvedValue({
    success: true,
    data: {
      token: "test-form-access-jwt",
      expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
    },
  }),
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

function renderSurveyComponent() {
  return render(
    <FormRuntimeProvider
      initialState={{
        formId: defaultProps.formId,
      }}
    >
      <SurveyComponent {...defaultProps} />
    </FormRuntimeProvider>,
  );
}

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
    mockSubmitPublicForm.mockResolvedValue({
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
    renderSurveyComponent();

    // Act
    let completeEventMocks!: ReturnType<typeof fireCompleteEvent>;
    await act(async () => {
      completeEventMocks = fireCompleteEvent();
    });

    // Assert
    expect(mockSubmitPublicForm).toHaveBeenCalledTimes(1);
    expect(mockClearQueue).toHaveBeenCalledTimes(1);
    expect(mockWaitForInFlightPartial).toHaveBeenCalledTimes(1);
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

  it("sends a structured embed completion payload after successful submission", async () => {
    // Arrange
    mockSubmitPublicForm.mockResolvedValue({
      success: true,
      data: {
        submissionId: "sub-456",
        isComplete: true,
        status: "completed",
        completedAt: "2026-05-26T10:00:00.000Z",
      },
    });
    renderSurveyComponent();

    // Act
    await act(async () => {
      fireCompleteEvent();
    });

    // Assert
    expect(mockSendEmbedMessage).toHaveBeenCalledWith("form-complete", {
      submissionId: "sub-456",
      success: true,
      isComplete: true,
      status: "completed",
      completedAt: "2026-05-26T10:00:00.000Z",
    });
  });

  it("should reset the guard flag on submission failure", async () => {
    // Arrange
    mockSubmitPublicForm.mockResolvedValue(
      ApiResult.networkError("Network error"),
    );
    renderSurveyComponent();

    // Act
    let completeEventMocks!: ReturnType<typeof fireCompleteEvent>;
    await act(async () => {
      completeEventMocks = fireCompleteEvent();
    });

    // Assert
    await expect(mockSubmitPublicForm).toHaveBeenCalledTimes(1);
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

  it("sends a structured embed error payload after failed submission", async () => {
    // Arrange
    mockSubmitPublicForm.mockResolvedValue(
      ApiResult.networkError("Network error"),
    );
    renderSurveyComponent();

    // Act
    await act(async () => {
      fireCompleteEvent();
    });

    // Assert
    expect(mockSendEmbedMessage).toHaveBeenCalledWith("form-error", {
      success: false,
      error: {
        type: "NetworkError",
        code: "NETWORK_ERROR",
        message: "Network error",
      },
    });
  });

  it("should prevent a second concurrent submission attempt", async () => {
    // Arrange
    renderSurveyComponent();

    // Act: firing first onComplete - Submission starts, guard is set
    await act(async () => {
      fireCompleteEvent();
    });
    await expect(mockSubmitPublicForm).toHaveBeenCalledTimes(1);

    // Act: firing a second onComplete immediately (while first is pending)
    let secondCompleteEventMocks!: ReturnType<typeof fireCompleteEvent>;
    await act(async () => {
      secondCompleteEventMocks = fireCompleteEvent();
    });

    // Assert: that the submission action was NOT called again
    await expect(mockSubmitPublicForm).toHaveBeenCalledTimes(1);
    await expect(
      secondCompleteEventMocks.showSaveInProgress,
    ).not.toHaveBeenCalled();
    await expect(mockSubmitPublicForm).toHaveBeenCalledTimes(1);
  });
});
