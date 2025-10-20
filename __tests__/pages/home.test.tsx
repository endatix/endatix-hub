import { expect, describe, it, vi, beforeEach } from "vitest";
vi.mock("next/server", () => ({}));
vi.mock("next-auth", () => ({}));

// Mock the auth module BEFORE importing the page to prevent Next.js server module import issues
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

// Mock next/navigation BEFORE importing the page
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock fetch for the API call
global.fetch = vi.fn();

describe.skip("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    process.env.ENDATIX_API_URL = "http://localhost:3000";
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
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockResolvedValue(mockUserInfo),
    } as any);

    // Dynamically import after mocks are in place
    const { default: HomePage } = await import("@/app/(main)/page");
    const result = await HomePage();

    // Check that the component renders without throwing
    expect(result).toBeDefined();
    expect(result).toMatchSnapshot();
  });

  it("should redirect to /forms in production", async () => {
    // Set NODE_ENV to production
    process.env.NODE_ENV = "production";
    
    const { redirect } = await import("next/navigation");
    const { default: HomePage } = await import("@/app/(main)/page");
    await HomePage();
    
    expect(redirect).toHaveBeenCalledWith("/forms");
  });

  it("should handle API errors gracefully", async () => {
    // Mock API error
    vi.mocked(fetch).mockRejectedValue(new Error("API Error"));

    const { default: HomePage } = await import("@/app/(main)/page");
    const result = await HomePage();
    expect(result).toBeDefined();
    expect(result).toMatchSnapshot();
    
    // Verify that the user info section is not rendered when there's an error
    // Since userInfo will be null, the user info debug section should not appear
    const userInfoSection = result.props.children.find(
      (child: any) => child?.props?.children?.[0]?.props?.children === "User Info Claims (Debug)"
    );
    expect(userInfoSection).toBeUndefined();
  });
});