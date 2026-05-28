import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextProxy, NextRequest, NextResponse } from "next/server";
import {
  SIGNIN_PATH,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure/auth-constants";
import { shouldRedirectToLogin } from "@/proxy";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const BASE_URL = "https://example.com";

type ProxyHandler = (req: NextRequest) => Promise<NextResponse>;

function createRequest(pathname: string, search = ""): NextRequest {
  const url = `${BASE_URL}${pathname}${search ? `?${search}` : ""}`;
  return new NextRequest(url);
}

async function getProxy(): Promise<ProxyHandler> {
  return (await import("@/proxy")).default as ProxyHandler;
}

describe("proxy", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("auth routes", () => {
    it("should allow /signin without session", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/signin");
      const response = await proxy(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(auth).toHaveBeenCalled();
    });

    it("should allow /create-account without session", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/create-account");
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it("should allow /auth-error without session", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/auth-error");
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe("hub paths without session", () => {
    it("should redirect to signin when accessing /forms without session", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/forms");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toBeDefined();
      expect(location).toContain(SIGNIN_PATH);
      expect(location).toContain(
        `${RETURN_URL_PARAM}=${encodeURIComponent("/forms")}`,
      );
    });

    it("should redirect to signin when accessing /settings without session", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/settings");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain(SIGNIN_PATH);
      expect(location).toContain(encodeURIComponent("/settings"));
    });

    it("should redirect to signin when accessing /my-account without session", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/my-account");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain(SIGNIN_PATH);
    });
  });

  describe("hub paths with session error", () => {
    it("should redirect to signin when session has error", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: "u1", email: "a@b.com" },
        error: "AccessDenied",
        expires: "2025-01-01",
      } as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/forms");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain(SIGNIN_PATH);
    });
  });

  describe("hub paths with valid session", () => {
    it("should allow /forms when session is valid", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: "u1", email: "a@b.com" },
        expires: "2025-01-01",
      } as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/forms");
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it("should allow /forms/some-id when session is valid", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: "u1", email: "a@b.com" },
        expires: "2025-01-01",
      } as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/forms/abc-123");
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe("redirectToLogin behavior", () => {
    it("should include search params in returnUrl when redirecting from hub path", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/forms", "tab=submissions");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain(encodeURIComponent("/forms?tab=submissions"));
    });

    it("should include the configured base path in the signin redirect", async () => {
      vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/app");
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/forms");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(
        `${BASE_URL}/app${SIGNIN_PATH}?${RETURN_URL_PARAM}=${encodeURIComponent(
          "/forms",
        )}`,
      );
    });

  });

  describe("non-auth, non-hub paths", () => {
    it("should allow request when path is / (root is not a hub path)", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/");
      const response = await proxy(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Location")).toBeNull();
    });

    it("should allow request when path is not auth and not hub", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as unknown as NextProxy);

      const proxy = await getProxy();
      const request = createRequest("/some-other-path");
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });
  });

  describe("config", () => {
    it("should export matcher config", async () => {
      const { config } = await import("@/proxy");

      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      expect(config.matcher[0]).toHaveProperty("source");
      expect(config.matcher[0]).toHaveProperty("missing");
    });
  });

  describe("maintenance mode", () => {
    beforeEach(async () => {
      vi.stubEnv("MAINTENANCE_MODE", "true");
      const { auth } = await import("@/auth");
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should rewrite with 503 and not call auth", async () => {
      const { auth } = await import("@/auth");
      const proxy = await getProxy();
      const response = await proxy(createRequest("/forms"));

      expect(auth).not.toHaveBeenCalled();
      expect(response.status).toBe(503);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should set Retry-After when MAINTENANCE_RETRY_AFTER_SECONDS is valid", async () => {
      vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "600");
      const { auth } = await import("@/auth");
      const proxy = await getProxy();
      const response = await proxy(createRequest("/"));

      expect(auth).not.toHaveBeenCalled();
      expect(response.status).toBe(503);
      expect(response.headers.get("Retry-After")).toBe("600");
    });
  });
});

describe("shouldRedirectToLogin (pure)", () => {
  it("returns false for auth routes even without session", () => {
    expect(shouldRedirectToLogin("/signin", null)).toBe(false);
    expect(shouldRedirectToLogin("/create-account", null)).toBe(false);
    expect(shouldRedirectToLogin("/auth-error", null)).toBe(false);
  });

  it("returns false for non-hub paths", () => {
    expect(shouldRedirectToLogin("/", null)).toBe(false);
    expect(shouldRedirectToLogin("/some-other-path", null)).toBe(false);
  });

  it("returns true for hub paths without session", () => {
    expect(shouldRedirectToLogin("/forms", null)).toBe(true);
    expect(shouldRedirectToLogin("/settings", null)).toBe(true);
    expect(shouldRedirectToLogin("/my-account", null)).toBe(true);
    expect(shouldRedirectToLogin("/forms/abc-123", null)).toBe(true);
  });

  it("returns true for hub paths with session error", () => {
    expect(shouldRedirectToLogin("/forms", { error: "AccessDenied" })).toBe(
      true,
    );
  });

  it("returns false for hub paths with valid session", () => {
    expect(shouldRedirectToLogin("/forms", {})).toBe(false);
    expect(shouldRedirectToLogin("/forms", { error: undefined })).toBe(false);
  });
});
