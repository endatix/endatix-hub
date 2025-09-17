import { expect, describe, it, vi, beforeEach } from "vitest";
import HomePage from "@/app/(main)/page";

// Mock the auth module to prevent Next.js server module import issues
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "test-user",
      name: "Test User",
      email: "test@example.com",
    },
    accessToken: "test-access-token",
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock fetch for the API call
global.fetch = vi.fn();

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    process.env.ENDATIX_BASE_URL = "http://localhost:3000";
  });

  it("should render home page with session info in development", async () => {
    // Mock successful API response
    const mockUserInfo = {
      claims: {
        sub: "test-user",
        email: "test@example.com",
        name: "Test User",
      },
    };
    
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockUserInfo),
    } as any);

    // Render the component
    const result = await HomePage();

    // Check that the component renders without throwing
    expect(result).toBeDefined();
    expect(result.type).toBe("div");
  });

  it("should redirect to /forms in production", async () => {
    // Set NODE_ENV to production
    process.env.NODE_ENV = "production";
    
    const { redirect } = await import("next/navigation");
    
    // This should trigger redirect
    await HomePage();
    
    expect(redirect).toHaveBeenCalledWith("/forms");
  });

  it("should handle API errors gracefully", async () => {
    // Mock API error
    vi.mocked(fetch).mockRejectedValue(new Error("API Error"));

    // The component should handle the error gracefully and still render
    // The getCurrentUserInfo function catches errors and returns null
    const result = await HomePage();
    expect(result).toBeDefined();
    expect(result.type).toBe("div");
    
    // Verify that the user info section is not rendered when there's an error
    // Since userInfo will be null, the user info debug section should not appear
    const userInfoSection = result.props.children.find(
      (child: any) => child?.props?.children?.[0]?.props?.children === "User Info Claims (Debug)"
    );
    expect(userInfoSection).toBeUndefined();
  });
});