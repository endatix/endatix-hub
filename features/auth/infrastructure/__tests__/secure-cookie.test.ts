import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getToken } from "next-auth/jwt";
import { TelemetryLogger } from "@/features/telemetry";
import { secureCookieFromAuthUrl } from "../session-utils";
import { getAuthJwtFromRequest } from "../auth-jwt.utils";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { warn: vi.fn(), error: vi.fn() },
}));

describe("secureCookieFromAuthUrl", () => {
  it("is true for an https AUTH_URL", () => {
    expect(secureCookieFromAuthUrl("https://hub.example.com")).toBe(true);
  });

  it("is false for http, so local setups keep the plain cookie name", () => {
    expect(secureCookieFromAuthUrl("http://localhost:8080")).toBe(false);
  });

  it("is false when AUTH_URL is missing or not a URL", () => {
    expect(secureCookieFromAuthUrl(undefined)).toBe(false);
    expect(secureCookieFromAuthUrl("not a url")).toBe(false);
  });
});

describe("getAuthJwtFromRequest", () => {
  const originalAuthUrl = process.env.AUTH_URL;

  beforeEach(() => {
    vi.mocked(getToken).mockReset();
    vi.mocked(TelemetryLogger.warn).mockReset();
  });

  afterEach(() => {
    process.env.AUTH_URL = originalAuthUrl;
  });

  it("asks Auth.js for the __Secure- cookie when AUTH_URL is https", async () => {
    process.env.AUTH_URL = "https://hub.example.com";
    vi.mocked(getToken).mockResolvedValue({ sub: "user" });

    await getAuthJwtFromRequest();

    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true }),
    );
    expect(TelemetryLogger.warn).not.toHaveBeenCalled();
  });

  it("asks for the plain cookie on http and logs when the cookie is missing", async () => {
    process.env.AUTH_URL = "http://localhost:3000";
    vi.mocked(getToken).mockResolvedValue(null);

    await getAuthJwtFromRequest();

    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: false }),
    );
    expect(TelemetryLogger.warn).toHaveBeenCalledWith(
      "Hub session cookie was not read",
      expect.objectContaining({
        secureCookie: false,
        reason: "session_cookie_missing",
      }),
      "auth.logout",
    );
  });
});
