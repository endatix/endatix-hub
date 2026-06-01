import ShareFormPage from "@/app/(public)/share/[formId]/page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  forbidden: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => (key === "token" ? "test-token" : null)),
  })),
  useRouter: vi.fn(),
}));

vi.mock("@/features/public-form/ui/public-survey-content", () => ({
  PublicSurveyContent: ({
    formId,
    urlToken,
    variant,
  }: {
    formId: string;
    urlToken?: string;
    variant: string;
  }) => (
    <div
      data-form-id={formId}
      data-testid="public-survey-content"
      data-token={urlToken}
      data-variant={variant}
    />
  ),
}));

vi.mock("@/features/public-form/ui/public-survey-skeleton", () => ({
  PublicSurveySkeleton: ({ variant }: { variant: string }) => (
    <div data-testid="public-survey-skeleton" data-variant={variant} />
  ),
}));

describe("ShareForm Page", () => {
  it("renders the shared respondent content inside the share shell", async () => {
    const component = await ShareFormPage({
      params: Promise.resolve({ formId: "valid-id" }),
      searchParams: Promise.resolve({}),
    });

    render(component);

    const content = screen.getByTestId("public-survey-content");
    expect(content.getAttribute("data-form-id")).toBe("valid-id");
    expect(content.getAttribute("data-variant")).toBe("share");
  });

  it("passes the URL token to respondent content", async () => {
    const accessToken = "submission.1705824000.rw.signature";
    const component = await ShareFormPage({
      params: Promise.resolve({ formId: "valid-id" }),
      searchParams: Promise.resolve({ token: accessToken }),
    });

    render(component);

    expect(
      screen.getByTestId("public-survey-content").getAttribute("data-token"),
    ).toBe(accessToken);
  });

  it("keeps the existing read/write token pre-checks", async () => {
    const component = await ShareFormPage({
      params: Promise.resolve({ formId: "valid-id" }),
      searchParams: Promise.resolve({
        token: "submission.1705824000.r.signature",
      }),
    });

    render(component);

    expect(screen.getByText("Access Denied")).toBeDefined();
    expect(
      screen.getByText("The access token does not include edit permissions."),
    ).toBeDefined();
    expect(screen.queryByTestId("public-survey-content")).toBeNull();
  });
});
