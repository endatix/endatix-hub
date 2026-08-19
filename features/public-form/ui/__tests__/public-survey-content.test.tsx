import { PublicSurveyContent } from "@/features/public-form/ui/public-survey-content";
import type { SurveyJsWrapperProps } from "@/features/public-form/ui/survey-js-wrapper";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import type { LoadPublicSurveyPageResult } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { getClientStorageConfig } from "@/features/asset-storage/server";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ScriptProps } from "next/script";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { tokenStore } = vi.hoisted(() => ({
  tokenStore: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    deleteToken: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("next/script", () => ({
  default: ({ children, ...props }: ScriptProps) => (
    <script {...props}>{children}</script>
  ),
}));

vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(function () {
    return tokenStore;
  }),
}));

vi.mock(
  "@/features/public-form/use-cases/load-public-survey-page.use-case",
  () => ({
    loadPublicSurveyPageUseCase: vi.fn(),
  }),
);

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
  getClientStorageConfig: vi.fn(() => null),
}));

vi.mock("@/features/public-form/ui/survey-js-wrapper", () => ({
  default: (props: SurveyJsWrapperProps) => (
    <div
      data-definition-id={
        props.survey.variant === "embed"
          ? props.survey.activeDefinition.id
          : undefined
      }
      data-form-id={props.survey.formId}
      data-initial-phase={props.survey.submissionPhase}
      data-is-embed={String(props.survey.variant === "embed")}
      data-limit-one-per-user={
        props.survey.variant === "embed"
          ? String(props.survey.activeDefinition.limitOnePerUser ?? false)
          : undefined
      }
      data-requires-recaptcha={String(
        Boolean(props.survey.activeDefinition.requiresReCaptcha),
      )}
      data-submission-id={props.survey.submission?.id}
      data-testid="survey-js-wrapper"
      data-test-mode={String(Boolean(props.survey.isRespondentTestMode))}
      data-token={props.survey.urlToken}
    />
  ),
}));

const successResult: LoadPublicSurveyPageResult = {
  kind: "success",
  activeDefinition: {
    id: "definition-1",
    isDraft: false,
    jsonData: "{}",
    formId: "form-1",
    isActive: true,
    createdAt: new Date(),
    modifiedAt: new Date(),
    limitOnePerUser: true,
    requiresReCaptcha: false,
  },
  submissionPhase: "active",
  isRespondentTestMode: true,
  submission: {
    id: "submission-1",
    isComplete: false,
  } as never,
};

describe("PublicSurveyContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({} as never);
    vi.mocked(getClientStorageConfig).mockReturnValue(null as never);
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue(successResult);
  });

  it("renders share survey content from the shared loader", async () => {
    const component = await PublicSurveyContent({
      formId: "form-1",
      urlToken: "submission.1705824000.rw.signature",
      variant: "share",
    });

    render(component);

    const wrapper = screen.getByTestId("survey-js-wrapper");
    expect(loadPublicSurveyPageUseCase).toHaveBeenCalledWith({
      formId: "form-1",
      tokenStore,
      urlToken: "submission.1705824000.rw.signature",
    });
    expect(wrapper.getAttribute("data-form-id")).toBe("form-1");
    expect(wrapper.getAttribute("data-is-embed")).toBe("false");
    expect(wrapper.getAttribute("data-test-mode")).toBe("true");
    expect(wrapper.getAttribute("data-submission-id")).toBe("submission-1");
    expect(wrapper.getAttribute("data-token")).toBe(
      "submission.1705824000.rw.signature",
    );
  });

  it("renders embed-only props and height reporter for embed content", async () => {
    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "embed",
    });

    render(component);

    const wrapper = screen.getByTestId("survey-js-wrapper");
    expect(screen.getByTestId("embed-height-reporter")).toBeDefined();
    expect(wrapper.getAttribute("data-is-embed")).toBe("true");
    expect(wrapper.getAttribute("data-definition-id")).toBe("definition-1");
    expect(wrapper.getAttribute("data-limit-one-per-user")).toBe("true");
  });

  it("renders token submission errors", async () => {
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue({
      kind: "tokenSubmissionError",
      errorCode: ERROR_CODE.INVALID_TOKEN,
    });

    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "share",
    });

    render(component);

    expect(screen.getByText("Token Expired")).toBeDefined();
    expect(screen.queryByTestId("survey-js-wrapper")).toBeNull();
  });

  it("delegates missing forms to notFound", async () => {
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue({
      kind: "notFound",
    });

    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "share",
    });

    render(component);

    expect(notFound).toHaveBeenCalled();
    expect(screen.queryByTestId("survey-js-wrapper")).toBeNull();
  });

  it("renders sign-in required copy for unauthenticated private-form access", async () => {
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue({
      kind: "unauthorized",
    });

    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "share",
    });

    render(component);

    expect(screen.getByText("401")).toBeDefined();
    expect(screen.getByText("Sign in required")).toBeDefined();
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("survey-js-wrapper")).toBeNull();
    expect(screen.queryByTestId("embed-height-reporter")).toBeNull();
  });

  it("reports embed height for unauthenticated private-form access", async () => {
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue({
      kind: "unauthorized",
    });

    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "embed",
    });

    render(component);

    expect(screen.getByTestId("embed-height-reporter")).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
  });

  it("renders access-denied copy for authenticated private-form denial", async () => {
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue({
      kind: "forbidden",
    });

    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "share",
    });

    render(component);

    expect(screen.getByText("403")).toBeDefined();
    expect(screen.getByText("Access denied")).toBeDefined();
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("survey-js-wrapper")).toBeNull();
  });

  it("renders a load-failure screen for operational access errors", async () => {
    vi.mocked(loadPublicSurveyPageUseCase).mockResolvedValue({
      kind: "accessLoadError",
      errorCode: ERROR_CODE.NETWORK_ERROR,
    });

    const component = await PublicSurveyContent({
      formId: "form-1",
      variant: "share",
    });

    render(component);

    expect(screen.getByText("Unable to load form")).toBeDefined();
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("survey-js-wrapper")).toBeNull();
  });
});
