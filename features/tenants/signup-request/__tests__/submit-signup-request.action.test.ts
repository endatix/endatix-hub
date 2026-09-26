import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { submitSignupRequestAction } from "../submit-signup-request.action";

vi.mock("@/lib/feature-flags/flags", () => ({
  saasManagementFlag: vi.fn(),
}));

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
    vi.clearAllMocks();
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
    expect(state.message).toBe(
      "Signup is not enabled for this environment.",
    );
  });

  it("sends the trimmed request and returns the API message", async () => {
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
    expect(state).toEqual({ isSuccess: true, message: "Request received." });
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
