// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../../shared/auth.service";
import { cookies } from "next/headers";
import { Result } from "@/lib/result";
import { JwtService } from "../../infrastructure/jwt.service";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("../../infrastructure/jwt.service", () => ({
  JwtService: vi.fn(),
}));

// Mock the auth function from NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("AuthService", () => {
  let authService: AuthService;
  let mockCookieStore: Partial<ReadonlyRequestCookies>;
  let mockJwtService: Partial<JwtService>;

  const testCookieOptions = {
    name: "test-session",
    encryptionKey: "test-secret",
    secure: false,
    httpOnly: true,
  };

  beforeEach(() => {
    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      getAll: vi.fn(),
      delete: vi.fn(),
    };

    // Cast to Promise to satisfy the cookies() return type
    vi.mocked(cookies).mockReturnValue(
      Promise.resolve(mockCookieStore as ReadonlyRequestCookies),
    );

    mockJwtService = {
      encryptToken: vi.fn(),
      decryptToken: vi.fn(),
      decodeAccessToken: vi.fn(),
    };

    vi.mocked(JwtService).mockImplementation(
      () => mockJwtService as JwtService,
    );

    authService = new AuthService(testCookieOptions);
  });

  describe("initialization", () => {
    it("should not throw error when SESSION_SECRET is not provided", () => {
      // Arrange
      delete process.env.SESSION_SECRET;

      // Act & Assert
      expect(() => new AuthService()).not.toThrow();
    });
  });

  describe("login", () => {
    const testCredentials = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      username: "test@example.com",
    };

    it("should set session cookie with encrypted token when valid access token provided", async () => {
      // Arrange
      const mockEncryptedToken = "encrypted-jwt-token";
      const mockDecodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      vi.mocked(mockJwtService.decodeAccessToken!).mockReturnValue(
        mockDecodedToken,
      );
      vi.mocked(mockJwtService.encryptToken!).mockResolvedValue(
        mockEncryptedToken,
      );

      // Act
      await authService.login(
        testCredentials.accessToken,
        testCredentials.refreshToken,
        testCredentials.username,
      );

      // Assert
      expect(mockJwtService.decodeAccessToken).toHaveBeenCalledWith(
        testCredentials.accessToken,
      );
      expect(mockJwtService.encryptToken).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: testCredentials.username,
          accessToken: testCredentials.accessToken,
          refreshToken: testCredentials.refreshToken,
        }),
        expect.any(Date),
      );
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: testCookieOptions.name,
          value: mockEncryptedToken,
          httpOnly: true,
          secure: testCookieOptions.secure,
          sameSite: "lax",
          path: "/",
          expires: expect.any(Date),
        }),
      );
    });

    it("should not set cookie if access token is invalid", async () => {
      // Arrange
      vi.mocked(mockJwtService.decodeAccessToken!).mockReturnValue(null);

      // Act
      await authService.login(
        testCredentials.accessToken,
        testCredentials.refreshToken,
        testCredentials.username,
      );

      // Assert
      expect(mockJwtService.encryptToken).not.toHaveBeenCalled();
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("should not set cookie if credentials are missing", async () => {
      // Act
      await authService.login("", "", "");

      // Assert
      expect(mockJwtService.decodeAccessToken).not.toHaveBeenCalled();
      expect(mockJwtService.encryptToken).not.toHaveBeenCalled();
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
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
      vi.mocked(auth).mockResolvedValue({ user: null });

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

  describe("logout", () => {
    it("should clear session cookie if it exists", async () => {
      // Arrange
      vi.mocked(mockCookieStore.has!).mockReturnValue(true);

      // Act
      await authService.logout();

      // Assert
      expect(mockCookieStore.has).toHaveBeenCalledWith(testCookieOptions.name);
      expect(mockCookieStore.set).toHaveBeenCalledWith({
        name: testCookieOptions.name,
        value: "",
        httpOnly: true,
        secure: testCookieOptions.secure,
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
    });

    it("should not attempt to clear cookie if it does not exist", async () => {
      // Arrange
      vi.mocked(mockCookieStore.has!).mockReturnValue(false);

      // Act
      await authService.logout();

      // Assert
      expect(mockCookieStore.has).toHaveBeenCalledWith(testCookieOptions.name);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });
});
