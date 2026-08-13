import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SurveyComponent from "../survey-component";
import { SurveyModel, CompleteEvent } from "survey-core";
import { ApiResult } from "@/lib/endatix-api";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import { DEFAULT_FILL_BACKGROUND_COLOR } from "@/features/embed-form/height-mode";

function cssColor(value: string): string {
  const probe = document.createElement("div");
  probe.style.backgroundColor = value;
  return probe.style.backgroundColor;
}

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
  mockGetEmbedMessagingContext,
  mockUseSurveyTheme,
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
  mockGetEmbedMessagingContext: vi.fn(() => ({})),
  mockUseSurveyTheme: vi.fn(
    (..._args: unknown[]): { theme: unknown; error: unknown } => ({
      theme: undefined,
      error: null,
    }),
  ),
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

vi.mock("@/features/embed-form/ui/embed-messaging-context", () => ({
  getEmbedMessagingContext: () => mockGetEmbedMessagingContext(),
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

vi.mock("../use-survey-theme.hook", () => ({
  useSurveyTheme: (...args: unknown[]) => mockUseSurveyTheme(...args),
}));

vi.mock("../language-selector", () => ({
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

function renderSurveyComponent(
  propsOverride: Partial<typeof defaultProps> = {},
) {
  return render(
    <FormRuntimeProvider
      initialState={{
        formId: defaultProps.formId,
      }}
    >
      <SurveyComponent {...defaultProps} {...propsOverride} />
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

  it("waits for in-flight partial before calling submitPublicForm", async () => {
    // Arrange
    let resolveWaitForPartial: () => void;
    const waitForPartialPromise = new Promise<void>((resolve) => {
      resolveWaitForPartial = resolve;
    });
    mockWaitForInFlightPartial.mockReturnValue(waitForPartialPromise);
    renderSurveyComponent();

    // Act
    await act(async () => {
      fireCompleteEvent();
    });

    // Assert
    expect(mockWaitForInFlightPartial).toHaveBeenCalledTimes(1);
    expect(mockSubmitPublicForm).not.toHaveBeenCalled();

    // Act
    await act(async () => {
      resolveWaitForPartial!();
      await waitForPartialPromise;
    });

    // Assert
    expect(mockSubmitPublicForm).toHaveBeenCalledTimes(1);
    expect(mockWaitForInFlightPartial.mock.invocationCallOrder[0]).toBeLessThan(
      mockSubmitPublicForm.mock.invocationCallOrder[0],
    );
  });

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
    realSurveyModel.completedHtml =
      "<h3>Thank you for completing the survey</h3>";
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
    expect(completeEventMocks.showSaveError).toHaveBeenCalledWith(
      "Network error",
    );
    expect(realSurveyModel.showCompletePage).toBe(true);
    expect(realSurveyModel.completedHtml).toBe(
      "<h3>Failed to submit your form</h3>",
    );

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

  it("restores thank-you HTML after a successful retry", async () => {
    const thankYouHtml = "<h3>Thank you for completing the survey</h3>";
    realSurveyModel.completedHtml = thankYouHtml;
    mockSubmitPublicForm
      .mockResolvedValueOnce(ApiResult.networkError("Network error"))
      .mockResolvedValueOnce({
        success: true,
        data: { submissionId: "sub-456" },
      });
    renderSurveyComponent();

    await act(async () => {
      fireCompleteEvent();
    });
    expect(realSurveyModel.completedHtml).toBe(
      "<h3>Failed to submit your form</h3>",
    );

    await act(async () => {
      fireCompleteEvent();
    });

    expect(realSurveyModel.completedHtml).toBe(thankYouHtml);
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

describe("SurveyComponent - Embed Fill Mode", () => {
  let realSurveyModel: SurveyModel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEmbedMessagingContext.mockReturnValue({});
    mockUseSurveyTheme.mockReturnValue({ theme: undefined, error: null });
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";

    realSurveyModel = new SurveyModel(defaultProps.definition);
    mockUseSurveyModel.mockImplementation(() => ({
      surveyModel: realSurveyModel,
      isLoading: false,
      error: null,
    }));
  });

  it("paints html/body with the survey's theme background when embedded in fill mode", async () => {
    // Arrange
    mockGetEmbedMessagingContext.mockReturnValue({
      heightMode: "fill",
      embedId: "embed-1",
    });
    Object.defineProperty(realSurveyModel, "themeVariables", {
      configurable: true,
      value: { "--sjs-general-backcolor-dim": "rgb(9, 8, 7)" },
    });

    // Act
    let result!: ReturnType<typeof renderSurveyComponent>;
    await act(async () => {
      result = renderSurveyComponent({ isEmbed: true });
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe("rgb(9, 8, 7)");
    expect(document.documentElement.style.backgroundColor).toBe(
      "rgb(9, 8, 7)",
    );
    const shell = result.container.querySelector('[class*="embedShell"]');
    expect(shell?.className).toEqual(
      expect.stringContaining("embedShellFill"),
    );
  });

  it("falls back to --sjs-general-backcolor when the dim variable is missing", async () => {
    // Arrange
    mockGetEmbedMessagingContext.mockReturnValue({
      heightMode: "fill",
      embedId: "embed-1",
    });
    Object.defineProperty(realSurveyModel, "themeVariables", {
      configurable: true,
      value: { "--sjs-general-backcolor": "rgb(4, 5, 6)" },
    });

    // Act
    await act(async () => {
      renderSurveyComponent({ isEmbed: true });
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe(cssColor("rgb(4, 5, 6)"));
  });

  it("falls back to the default fill background when no theme variable is available", async () => {
    // Arrange
    mockGetEmbedMessagingContext.mockReturnValue({
      heightMode: "fill",
      embedId: "embed-1",
    });
    Object.defineProperty(realSurveyModel, "themeVariables", {
      configurable: true,
      value: {},
    });

    // Act
    await act(async () => {
      renderSurveyComponent({ isEmbed: true });
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe(
      cssColor(DEFAULT_FILL_BACKGROUND_COLOR),
    );
  });

  it("does not paint html/body in the default auto-resize embed mode", async () => {
    // Arrange
    mockGetEmbedMessagingContext.mockReturnValue({});

    // Act
    let result!: ReturnType<typeof renderSurveyComponent>;
    await act(async () => {
      result = renderSurveyComponent({ isEmbed: true });
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe("");
    expect(document.documentElement.style.backgroundColor).toBe("");
    const shell = result.container.querySelector('[class*="embedShell"]');
    expect(shell?.className).not.toEqual(
      expect.stringContaining("embedShellFill"),
    );
  });

  it("ignores heightMode=fill when not embedded at all", async () => {
    // Arrange
    mockGetEmbedMessagingContext.mockReturnValue({ heightMode: "fill" });

    // Act
    await act(async () => {
      renderSurveyComponent({ isEmbed: false });
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe("");
    expect(document.documentElement.style.backgroundColor).toBe("");
  });

  it("ignores heightMode=fill without an embedId (not a genuine SDK load)", async () => {
    // Arrange: only embed.js ever sets heightMode=fill, and it always sets
    // embedId alongside it — a bare ?heightMode=fill (e.g. someone opening
    // the embed URL directly) shouldn't trigger fill styling.
    mockGetEmbedMessagingContext.mockReturnValue({ heightMode: "fill" });

    // Act
    let result!: ReturnType<typeof renderSurveyComponent>;
    await act(async () => {
      result = renderSurveyComponent({ isEmbed: true });
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe("");
    expect(document.documentElement.style.backgroundColor).toBe("");
    const shell = result.container.querySelector('[class*="embedShell"]');
    expect(shell?.className).not.toEqual(
      expect.stringContaining("embedShellFill"),
    );
  });

  it("re-applies the background once the survey's real theme finishes applying", async () => {
    // Arrange: useSurveyTheme applies DefaultLight first and the real theme
    // a render later once it's parsed (see use-survey-theme.hook.tsx) — the
    // effect must re-run on that second pass, not just the first.
    mockGetEmbedMessagingContext.mockReturnValue({
      heightMode: "fill",
      embedId: "embed-1",
    });
    mockUseSurveyTheme.mockReturnValue({ theme: undefined, error: null });
    Object.defineProperty(realSurveyModel, "themeVariables", {
      configurable: true,
      value: { "--sjs-general-backcolor-dim": "rgb(1, 1, 1)" },
    });

    // Act: first pass, as if only DefaultLight has been applied so far.
    const result = renderSurveyComponent({ isEmbed: true });
    await act(async () => {});

    // Assert
    expect(document.body.style.backgroundColor).toBe("rgb(1, 1, 1)");

    // Act: second pass, simulating the real theme finishing application.
    Object.defineProperty(realSurveyModel, "themeVariables", {
      configurable: true,
      value: { "--sjs-general-backcolor-dim": "rgb(2, 2, 2)" },
    });
    mockUseSurveyTheme.mockReturnValue({
      theme: { themeName: "custom" },
      error: null,
    });
    await act(async () => {
      result.rerender(
        <FormRuntimeProvider initialState={{ formId: defaultProps.formId }}>
          <SurveyComponent {...defaultProps} isEmbed />
        </FormRuntimeProvider>,
      );
    });

    // Assert
    expect(document.body.style.backgroundColor).toBe("rgb(2, 2, 2)");
  });
});
