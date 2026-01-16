import ShareFormPage from "@/app/(public)/share/[formId]/page";
import { SurveyJsWrapperProps } from "@/features/public-form/ui/survey-js-wrapper";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import {
  getPartialSubmissionUseCase,
  PartialSubmissionResult,
} from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { ApiResult, Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { ActiveDefinition } from "@/types";
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { ScriptProps } from "next/script";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next.js modules
vi.mock("next/server", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  forbidden: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => (key === "token" ? "test-token" : null)),
  })),
  useRouter: vi.fn(),
}));

vi.mock("next/script", () => ({
  default: ({ children, ...props }: ScriptProps) => (
    <script {...props}>{children}</script>
  ),
}));

// Mock auth functions
vi.mock("@/features/auth", () => ({
  requireAdminAccess: vi.fn().mockResolvedValue(undefined),
}));

// Mock use cases
vi.mock(
  "@/features/public-form/use-cases/get-active-definition.use-case",
  () => ({
    getActiveDefinitionUseCase: vi.fn(),
  }),
);

vi.mock(
  "@/features/public-form/use-cases/get-partial-submission.use-case",
  () => ({
    getPartialSubmissionUseCase: vi.fn(),
  }),
);

vi.mock(
  "@/features/public-submissions/edit/get-submission-by-access-token.use-case",
  () => ({
    getSubmissionByAccessTokenUseCase: vi.fn(),
  }),
);

// Mock cookie store
vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(() => ({})),
}));

// Mock recaptcha config
vi.mock("@/features/recaptcha/recaptcha-config", () => ({
  recaptchaConfig: {
    isReCaptchaEnabled: vi.fn().mockReturnValue(false),
    JS_URL: "https://www.google.com/recaptcha/api.js",
  },
}));

// Mock recaptcha components
vi.mock("@/features/recaptcha/ui/recaptcha-style-fix", () => ({
  ReCaptchaStyleFix: () => <div data-testid="recaptcha-style-fix" />,
}));

// Mock SurveyJsWrapper
vi.mock("@/features/public-form/ui/survey-js-wrapper", () => ({
  default: ({
    formId,
    definition,
    submission,
    theme,
    customQuestions,
    requiresReCaptcha,
  }: SurveyJsWrapperProps) => (
    <div data-testid="survey-js-wrapper">
      <div data-testid="form-id">{formId}</div>
      <div data-testid="definition">{JSON.stringify(definition)}</div>
      <div data-testid="submission">{JSON.stringify(submission)}</div>
      <div data-testid="theme">{JSON.stringify(theme)}</div>
      <div data-testid="custom-questions">
        {JSON.stringify(customQuestions)}
      </div>
      <div data-testid="requires-recaptcha">
        {requiresReCaptcha?.toString()}
      </div>
    </div>
  ),
}));

describe("ShareForm Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound() when definition is not found", async () => {
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.error("Form not found"),
    );
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.notFoundError(
        "Submission not found",
      ) as PartialSubmissionResult,
    );

    const props = {
      params: Promise.resolve({ formId: "invalid-id" }),
      searchParams: Promise.resolve({}),
    };

    // The component should call notFound() and not return JSX
    await expect(ShareFormPage(props)).rejects.toThrow();

    // Verify notFound was called
    expect(notFound).toHaveBeenCalled();
  });

  it("renders form when definition is found", async () => {
    const mockDefinition = {
      jsonData: { title: "Test Form" },
      themeModel: {},
      customQuestions: [],
      requiresReCaptcha: false,
    };

    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.success(mockDefinition as unknown as ActiveDefinition),
    );
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.notFoundError("No submission") as PartialSubmissionResult,
    );

    const props = {
      params: Promise.resolve({ formId: "valid-id" }),
      searchParams: Promise.resolve({}),
    };

    const component = await ShareFormPage(props);
    render(component);

    expect(notFound).not.toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it("renders form with submission data when available", async () => {
    const mockDefinition = {
      jsonData: { title: "Test Form" },
      themeModel: { primaryColor: "#007bff" },
      customQuestions: [{ id: "q1", type: "text" }],
      requiresReCaptcha: false,
    };

    const mockSubmission = {
      data: { q1: "test answer" },
      timestamp: "2024-01-01T00:00:00Z",
    };

    const validAccessToken = "123.1705824000.rw.abc123def456";

    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.success(mockDefinition as unknown as ActiveDefinition),
    );
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success(mockSubmission as unknown as Submission),
    );

    const props = {
      params: Promise.resolve({ formId: "valid-id" }),
      searchParams: Promise.resolve({ token: validAccessToken }),
    };

    const component = await ShareFormPage(props);
    render(component);

    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("survey-js-wrapper")).toBeDefined();
    expect(screen.getByTestId("form-id").textContent || "").toContain(
      "valid-id",
    );
    expect(screen.getByTestId("submission").textContent || "").toContain(
      JSON.stringify(mockSubmission),
    );
    expect(screen.getByTestId("theme").textContent || "").toContain(
      JSON.stringify(mockDefinition.themeModel),
    );
    expect(screen.getByTestId("custom-questions").textContent || "").toContain(
      JSON.stringify(mockDefinition.customQuestions),
    );
  });
});
