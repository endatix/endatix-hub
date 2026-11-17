import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../../shared/auth.service";
import type { Session } from "next-auth";

// Mock the auth function from NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe("getSession", () => {
    it("should return anonymous session when no user session exists", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null!);

      // Act
      const session = await authService.getSession();

      // Assert
      expect(auth).toHaveBeenCalled();
      expect(session).toEqual({
        username: "",
        accessToken: "",
        refreshToken: "",
        isLoggedIn: false,
      });
    });

    it("should return anonymous session when user is null", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      // `auth` is overloaded; type the no-argument call the service makes.
      vi.mocked<() => Promise<Session | null>>(auth).mockResolvedValue({
        expires: "",
        // @ts-expect-error -- deliberately a null user, which Session does not allow
        user: null,
      });

      // Act
      const session = await authService.getSession();

      // Assert
      expect(auth).toHaveBeenCalled();
      expect(session).toEqual({
        username: "",
        accessToken: "",
        refreshToken: "",
        isLoggedIn: false,
      });
    });

    it("should return valid session for authenticated user", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const mockSession = {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
        },
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        expiresAt: 1717908000,
      };
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      // Act
      const session = await authService.getSession();

      // Assert
      expect(auth).toHaveBeenCalled();
      expect(session).toEqual({
        isLoggedIn: true,
        username: "Test User",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
      });
    });

    it("should use email as username when name is not available", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const mockSession = {
        user: {
          id: "user-123",
          name: null,
          email: "test@example.com",
        },
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
      };
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      // Act
      const session = await authService.getSession();

      // Assert
      expect(session).toEqual({
        isLoggedIn: true,
        username: "test@example.com",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
      });
    });

    it("should handle missing accessToken gracefully", async () => {
      // Arrange
      const { auth } = await import("@/auth");
      const mockSession = {
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
        },
        accessToken: null,
        refreshToken: "refresh-token-123",
      };
      vi.mocked(auth).mockResolvedValue(mockSession as any);

      // Act
      const session = await authService.getSession();

      // Assert
      expect(session).toEqual({
        isLoggedIn: true,
        username: "Test User",
        accessToken: "",
        refreshToken: "refresh-token-123",
      });
    });
  });
});
