import ShareFormPage from "@/app/(public)/share/[formId]/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import {
  getPartialSubmissionUseCase,
  PartialSubmissionResult,
} from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { notFound } from "next/navigation";
import { ActiveDefinition } from "@/types";
import { ApiResult } from "@/lib/endatix-api";

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
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockResolvedValue({}),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("ShareForm Page", async () => {
  beforeEach(() => {
    vi.resetModules();
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
});
