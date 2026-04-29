import EmbedFormPage from "@/app/(public)/embed/[formId]/page";
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

vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("@/features/public-form/ui/embed-height-reporter", () => ({
  EmbedHeightReporter: () => <div data-testid="embed-height-reporter" />,
}));

vi.mock("@/features/recaptcha/recaptcha-config", () => ({
  recaptchaConfig: {
    isReCaptchaEnabled: vi.fn().mockReturnValue(false),
    JS_URL: "https://www.google.com/recaptcha/api.js",
  },
}));

vi.mock("@/features/recaptcha/ui/recaptcha-style-fix", () => ({
  ReCaptchaStyleFix: () => <div data-testid="recaptcha-style-fix" />,
}));

vi.mock("@/features/asset-storage/server", () => ({
  AssetStorageProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="asset-storage-provider">{children}</div>
  ),
}));

vi.mock("@/features/public-form/ui/survey-js-wrapper", () => ({
  default: ({ formId }: SurveyJsWrapperProps) => (
    <div data-testid="survey-js-wrapper">
      <div data-testid="form-id">{formId}</div>
    </div>
  ),
}));

describe("EmbedForm Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders already responded when user already submitted without token", async () => {
    // Arrange
    const mockDefinition = {
      jsonData: { title: "Test Form" },
      hasUserSubmitted: true,
      metadata: JSON.stringify({
        alreadyResponded: { message: "You already completed this survey." },
      }),
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

    // Act
    const component = await EmbedFormPage(props);
    render(component);

    // Assert
    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(
      screen.getByText("You already completed this survey."),
    ).toBeDefined();
    expect(screen.queryByTestId("survey-js-wrapper")).toBeNull();
  });

  it("does not gate token edit flow when user already submitted", async () => {
    // Arrange
    const mockDefinition = {
      jsonData: { title: "Test Form" },
      hasUserSubmitted: true,
      metadata: JSON.stringify({
        alreadyResponded: { message: "You already completed this survey." },
      }),
      requiresReCaptcha: false,
    };
    const mockSubmission = {
      data: { q1: "existing answer" },
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

    // Act
    const component = await EmbedFormPage(props);
    render(component);

    // Assert
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("survey-js-wrapper")).toBeDefined();
    expect(screen.queryByText("Already Responded")).toBeNull();
  });
});
