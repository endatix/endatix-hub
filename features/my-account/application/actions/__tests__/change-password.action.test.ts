import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { changePasswordAction } from "../change-password.action";
import {
  EndatixApi,
  ApiResult,
  ChangePasswordRequestSchema,
} from "@/lib/endatix-api";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { authorization } from "@/features/auth/authorization";
import { IAuthorizationService } from "@/features/auth/authorization/domain/authorization-service";

type RedirectError = Error & { digest: string };

// Mock the auth module
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the authorization service
vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

// Mock the EndatixApi class
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
  ApiResult: {
    isSuccess: vi.fn(),
  },
  ChangePasswordRequestSchema: {
    safeParse: vi.fn(),
  },
}));

describe("changePasswordAction", () => {
  const mockFormData = new FormData();
  const mockEndatixApiInstance = {
    myAccount: {
      changePassword: vi.fn(),
    },
  };

  const mockSession: Session = {
    expires: "2025-02-02T00:00:00.000Z",
    accessToken: "test-token",
    refreshToken: "refresh-token",
    expiresAt: 1717908000,
    error: undefined,
    provider: undefined,
    user: {
      name: "testuser",
      email: "testuser@example.com",
      id: "testuser",
    },
  };

  const mockRequireHubAccess = vi.fn().mockResolvedValue(undefined);
  const mockAuthorizationService = {
    requireHubAccess: mockRequireHubAccess,
  } as unknown as IAuthorizationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormData.delete("currentPassword");
    mockFormData.delete("newPassword");
    mockFormData.delete("confirmPassword");

    // Reset mock implementations
    vi.mocked(EndatixApi).mockImplementation(
      () => mockEndatixApiInstance as unknown as EndatixApi,
    );
    (vi.mocked(auth) as Mock).mockResolvedValue(mockSession);

    // Reset permission service mock to default (no redirect)
    mockRequireHubAccess.mockResolvedValue(undefined);
    vi.mocked(authorization).mockResolvedValue(mockAuthorizationService);
  });

  it("should handle redirect when user lacks permissions", async () => {
    // Mock permission service to throw redirect error
    const redirectError = new Error("NEXT_REDIRECT");
    (redirectError as RedirectError).digest = "NEXT_REDIRECT";
    mockRequireHubAccess.mockRejectedValue(redirectError);

    // When redirect happens, the function should throw the redirect error
    await expect(
      changePasswordAction({ isSuccess: false }, mockFormData),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("should validate required fields", async () => {
    // Mock validation failure for missing fields
    vi.mocked(ChangePasswordRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          formErrors: ["All fields are required"],
          fieldErrors: {
            currentPassword: ["Current password is required"],
            newPassword: ["New password is required"],
            confirmPassword: ["Confirm password is required"],
          },
        }),
      },
    } as ReturnType<typeof ChangePasswordRequestSchema.safeParse>);

    const result = await changePasswordAction(
      { isSuccess: false },
      mockFormData,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.formErrors).toContain("All fields are required");
    expect(result.errors?.currentPassword).toContain(
      "Current password is required",
    );
    expect(result.errors?.newPassword).toContain("New password is required");
    expect(result.errors?.confirmPassword).toContain(
      "Confirm password is required",
    );
  });

  it("should validate password length", async () => {
    mockFormData.set("currentPassword", "123");
    mockFormData.set("newPassword", "123");
    mockFormData.set("confirmPassword", "123");

    // Mock validation failure for short passwords
    vi.mocked(ChangePasswordRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          formErrors: ["Password validation failed"],
          fieldErrors: {
            currentPassword: ["Password must be at least 8 characters"],
            newPassword: ["Password must be at least 8 characters"],
            confirmPassword: ["Password must be at least 8 characters"],
          },
        }),
      },
    } as ReturnType<typeof ChangePasswordRequestSchema.safeParse>);

    const result = await changePasswordAction(
      { isSuccess: false },
      mockFormData,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errors?.currentPassword).toContain(
      "Password must be at least 8 characters",
    );
    expect(result.errors?.newPassword).toContain(
      "Password must be at least 8 characters",
    );
  });

  it("should validate password match", async () => {
    mockFormData.set("currentPassword", "password123");
    mockFormData.set("newPassword", "newpassword123");
    mockFormData.set("confirmPassword", "different123");

    // Mock validation failure for password mismatch
    vi.mocked(ChangePasswordRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          formErrors: ["Password validation failed"],
          fieldErrors: {
            confirmPassword: ["Passwords do not match"],
          },
        }),
      },
    } as ReturnType<typeof ChangePasswordRequestSchema.safeParse>);

    const result = await changePasswordAction(
      { isSuccess: false },
      mockFormData,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errors?.confirmPassword).toContain("Passwords do not match");
  });

  it("should call API and return success when validation passes", async () => {
    const validPassword = "validPassword123";
    mockFormData.set("currentPassword", validPassword);
    mockFormData.set("newPassword", validPassword);
    mockFormData.set("confirmPassword", validPassword);

    // Mock successful validation
    vi.mocked(ChangePasswordRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {
        currentPassword: validPassword,
        newPassword: validPassword,
        confirmPassword: validPassword,
      },
    } as ReturnType<typeof ChangePasswordRequestSchema.safeParse>);

    const mockApiResult = { success: true, data: {} };
    vi.mocked(ApiResult.isSuccess).mockReturnValue(true);
    vi.mocked(
      mockEndatixApiInstance.myAccount.changePassword,
    ).mockResolvedValue(mockApiResult);

    const result = await changePasswordAction(
      { isSuccess: false },
      mockFormData,
    );

    expect(
      mockEndatixApiInstance.myAccount.changePassword,
    ).toHaveBeenCalledWith({
      currentPassword: validPassword,
      newPassword: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.isSuccess).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.formErrors).toBeUndefined();
  });

  it("should handle API errors", async () => {
    const validPassword = "validPassword123";
    mockFormData.set("currentPassword", validPassword);
    mockFormData.set("newPassword", validPassword);
    mockFormData.set("confirmPassword", validPassword);

    // Mock successful validation
    vi.mocked(ChangePasswordRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {
        currentPassword: validPassword,
        newPassword: validPassword,
        confirmPassword: validPassword,
      },
    } as ReturnType<typeof ChangePasswordRequestSchema.safeParse>);

    const mockApiResult = { success: false, error: { message: "API Error" } };
    vi.mocked(ApiResult.isSuccess).mockReturnValue(false);
    vi.mocked(
      mockEndatixApiInstance.myAccount.changePassword,
    ).mockResolvedValue(mockApiResult);

    const result = await changePasswordAction(
      { isSuccess: false },
      mockFormData,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.formErrors).toContain("API Error");
    expect(result.values).toEqual({
      currentPassword: validPassword,
      newPassword: validPassword,
      confirmPassword: validPassword,
    });
  });

  it("should preserve form values on validation failure", async () => {
    mockFormData.set("currentPassword", "short");
    mockFormData.set("newPassword", "short");
    mockFormData.set("confirmPassword", "short");

    // Mock validation failure
    vi.mocked(ChangePasswordRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          formErrors: ["Validation failed"],
          fieldErrors: {},
        }),
      },
    } as ReturnType<typeof ChangePasswordRequestSchema.safeParse>);

    const result = await changePasswordAction(
      { isSuccess: false },
      mockFormData,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.values).toEqual({
      currentPassword: "short",
      newPassword: "short",
      confirmPassword: "short",
    });
  });
});
