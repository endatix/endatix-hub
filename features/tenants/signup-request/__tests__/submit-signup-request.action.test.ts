import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  saasManagementFlag,
  termsAcceptanceEnabled,
} from "@/lib/feature-flags/flags";
import { refresh } from "next/cache";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { submitSignupRequestAction } from "../submit-signup-request.action";

vi.mock("@/lib/feature-flags/flags", () => ({
  saasManagementFlag: vi.fn(),
  termsAcceptanceEnabled: vi.fn(() => true),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();

  return {
    ...actual,
    EndatixApi: vi.fn(),
  };
});

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: {
    error: vi.fn(),
  },
}));

function signupFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("submitSignupRequestAction", () => {
  const createSignup = vi.fn();
  const emptyState = ServerActionState.emptyState();

  beforeEach(() => {
    delete process.env.POSTHOG_PROJECT_TOKEN;
    vi.mocked(saasManagementFlag).mockResolvedValue(true);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { signupRequests: { create: createSignup } } as never;
    });
    createSignup.mockResolvedValue(
      ApiResult.success({ message: "Request received." }),
    );
  });

  it("does not call the API when signup is disabled", async () => {
    // Arrange
    vi.mocked(saasManagementFlag).mockResolvedValue(false);

    // Act
    const state = await submitSignupRequestAction(
      emptyState,
      signupFormData({ email: "jane@example.com" }),
    );

    // Assert
    expect(createSignup).not.toHaveBeenCalled();
    expect(state.isSuccess).toBe(false);
    expect(state.message).toBe("Signup is not enabled for this environment.");
  });

  it("sends the selected version in the same request as the email", async () => {
    // Arrange
    const form = signupFormData({
      email: "user@example.com",
      acceptedTermsVersionId: "9007199254740993",
    });

    // Act
    await submitSignupRequestAction(emptyState, form);

    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "user@example.com",
      companyName: null,
      acceptedTermsVersionId: "9007199254740993",
    });
  });

  it("sends the trimmed request and returns a generic message", async () => {
    // Arrange
    const formData = signupFormData({
      email: " jane@example.com ",
      companyName: " Acme ",
    });

    // Act
    const state = await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "jane@example.com",
      companyName: "Acme",
    });
    expect(state).toEqual({
      isSuccess: true,
      message:
        "If your request is accepted, we will contact you at the email address provided.",
    });
  });

  it("refreshes changed Terms without resubmitting or retaining consent", async () => {
    // Arrange
    createSignup.mockResolvedValue(ApiResult.httpStatusError(409));
    const form = signupFormData({
      email: "user@example.com",
      acceptedTermsVersionId: "42",
    });
    // Act
    const state = await submitSignupRequestAction(emptyState, form);
    // Assert
    expect(refresh).toHaveBeenCalledOnce();
    expect(createSignup).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({
      isSuccess: false,
      data: { email: "user@example.com" },
    });
    expect(state.data).not.toHaveProperty("acceptedTermsVersionId");
  });

  it("omits a checked version if the feature was disabled since display", async () => {
    // Arrange
    vi.mocked(termsAcceptanceEnabled).mockResolvedValueOnce(false);
    const form = signupFormData({
      email: "user@example.com",
      acceptedTermsVersionId: "42",
    });
    // Act
    await submitSignupRequestAction(emptyState, form);
    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "user@example.com",
      companyName: null,
    });
  });

  it("sends a null company name when the field is blank", async () => {
    // Arrange
    const formData = signupFormData({
      email: "jane@example.com",
      companyName: "  ",
    });

    // Act
    await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "jane@example.com",
      companyName: null,
    });
  });

  it("returns an email field error and keeps the typed values", async () => {
    // Arrange
    const formData = signupFormData({
      email: "not-an-email",
      companyName: "Acme",
    });

    // Act
    const state = await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).not.toHaveBeenCalled();
    expect(state.isSuccess).toBe(false);
    expect(state.errors?.email).toEqual(["Enter a valid email address."]);
    expect(state.data).toEqual({ email: "not-an-email", companyName: "Acme" });
  });

  it("returns the API failure message and keeps the typed values", async () => {
    // Arrange
    createSignup.mockResolvedValue(
      ApiResult.rateLimitError("Too many requests."),
    );
    const formData = signupFormData({
      email: "jane@example.com",
      companyName: "Acme",
    });

    // Act
    const state = await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(state.isSuccess).toBe(false);
    expect(state.message).toBe("Too many requests.");
    expect(state.errors).toBeUndefined();
    expect(state.data).toEqual({
      email: "jane@example.com",
      companyName: "Acme",
    });
  });

  it("strips PostHog ids when the project token is unset", async () => {
    // Arrange
    const formData = signupFormData({
      email: "jane@example.com",
      companyName: "Acme",
      postHogDistinctId: "anon-1",
      postHogSessionId: "sess-1",
    });

    // Act
    await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "jane@example.com",
      companyName: "Acme",
    });
  });

  it("forwards PostHog ids when the project token is set", async () => {
    // Arrange
    process.env.POSTHOG_PROJECT_TOKEN = "phc_test";
    const formData = signupFormData({
      email: "jane@example.com",
      companyName: "",
      postHogDistinctId: "anon-1",
      postHogSessionId: "sess-1",
    });

    // Act
    await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "jane@example.com",
      companyName: null,
      postHogDistinctId: "anon-1",
      postHogSessionId: "sess-1",
    });
  });

  it("drops a PostHog id longer than 200 characters", async () => {
    // Arrange
    process.env.POSTHOG_PROJECT_TOKEN = "phc_test";
    const formData = signupFormData({
      email: "jane@example.com",
      postHogDistinctId: "a".repeat(201),
      postHogSessionId: "sess-1",
    });

    // Act
    await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).toHaveBeenCalledWith({
      email: "jane@example.com",
      companyName: null,
      postHogSessionId: "sess-1",
    });
  });

  it("skips the API when the honeypot is filled", async () => {
    // Arrange
    const formData = signupFormData({
      email: "bot@example.com",
      website: "spam",
    });

    // Act
    const state = await submitSignupRequestAction(emptyState, formData);

    // Assert
    expect(createSignup).not.toHaveBeenCalled();
    expect(state.isSuccess).toBe(true);
  });
});
