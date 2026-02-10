import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Form } from "@/types";

vi.mock("next/server", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  formAnalyticsFlag: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  getForm: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/features/form-analytics/ui/survey-dashboard-wrapper", () => ({
  SurveyDashboardWrapper: ({ surveyJson }: { surveyJson: object | null }) => (
    <div data-testid="survey-dashboard-wrapper">
      survey-dashboard {surveyJson == null ? "mock" : "custom"}
    </div>
  ),
}));

describe("Form Analytics Page", () => {
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    const { authorization } = await import("@/features/auth/authorization");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", name: "Test", email: "test@example.com" },
      accessToken: "token",
    } as any);
    vi.mocked(authorization).mockResolvedValue({ requireHubAccess } as any);
  });

  it("calls requireHubAccess for access control", async () => {
    const { formAnalyticsFlag } = await import("@/lib/feature-flags");
    const { getForm } = await import("@/services/api");
    vi.mocked(formAnalyticsFlag).mockResolvedValue(true);
    vi.mocked(getForm).mockResolvedValue({
      id: "f1",
      name: "My Form",
    } as Form);

    const FormAnalyticsPage = (
      await import("@/app/(main)/forms/[formId]/analytics/page")
    ).default;
    await FormAnalyticsPage({ params: Promise.resolve({ formId: "f1" }) });

    expect(requireHubAccess).toHaveBeenCalledTimes(1);
  });

  it("redirects to form when feature flag is disabled", async () => {
    const { formAnalyticsFlag } = await import("@/lib/feature-flags");
    const { redirect } = await import("next/navigation");
    vi.mocked(formAnalyticsFlag).mockResolvedValue(false);

    const FormAnalyticsPage = (
      await import("@/app/(main)/forms/[formId]/analytics/page")
    ).default;
    await FormAnalyticsPage({ params: Promise.resolve({ formId: "f1" }) });

    expect(redirect).toHaveBeenCalledWith("/forms/f1");
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("renders not found when form does not exist", async () => {
    const { formAnalyticsFlag } = await import("@/lib/feature-flags");
    const { getForm } = await import("@/services/api");
    vi.mocked(formAnalyticsFlag).mockResolvedValue(true);
    vi.mocked(getForm).mockRejectedValue(new Error("Not found"));

    const FormAnalyticsPage = (
      await import("@/app/(main)/forms/[formId]/analytics/page")
    ).default;
    const result = await FormAnalyticsPage({
      params: Promise.resolve({ formId: "bad-id" }),
    });

    const { getByText } = render(result);
    expect(getByText("Form not found")).toBeDefined();
    expect(getByText(/form you are looking for does not exist/i)).toBeDefined();
  });

  it("renders analytics page when form exists and flag is enabled", async () => {
    const { formAnalyticsFlag } = await import("@/lib/feature-flags");
    const { getForm } = await import("@/services/api");
    vi.mocked(formAnalyticsFlag).mockResolvedValue(true);
    vi.mocked(getForm).mockResolvedValue({
      id: "f1",
      name: "Reporting Form",
    } as Form);

    const FormAnalyticsPage = (
      await import("@/app/(main)/forms/[formId]/analytics/page")
    ).default;
    const result = await FormAnalyticsPage({
      params: Promise.resolve({ formId: "f1" }),
    });

    const { getByText, getByTestId, container } = render(result);
    expect(getByText(/Reporting: Reporting Form/i)).toBeDefined();
    expect(getByText(/Survey analytics and charts/i)).toBeDefined();
    expect(getByTestId("survey-dashboard-wrapper")).toBeDefined();
    expect(container).toMatchSnapshot();
  });
});
