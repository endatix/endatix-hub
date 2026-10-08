import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getToken } from "next-auth/jwt";
import { TelemetryLogger } from "@/features/telemetry";
import {
  configuredSecureCookies,
  sessionCookieName,
  shouldUseSecureSessionCookie,
} from "../session-utils";
import { getAuthJwtFromRequest } from "../auth-jwt.utils";

const { headerBag } = vi.hoisted(() => ({ headerBag: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => headerBag,
}));

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { warn: vi.fn(), error: vi.fn() },
}));

const SECURE = "__Secure-authjs.session-token";
const PLAIN = "authjs.session-token";

describe("shouldUseSecureSessionCookie", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["HTTP direct", undefined, "http", false, PLAIN],
    ["HTTPS direct", undefined, "https", true, SECURE],
    ["no forwarded proto", undefined, null, true, SECURE],
    [
      "HTTP internal, public https",
      "https://hub.example.com",
      "http",
      true,
      SECURE,
    ],
    [
      "HTTPS internal, public https",
      "https://hub.example.com",
      "https",
      true,
      SECURE,
    ],
    [
      "HTTP internal, public http",
      "http://hub.example.com",
      "http",
      false,
      PLAIN,
    ],
    [
      "HTTPS internal, public http",
      "http://localhost:8080",
      "https",
      false,
      PLAIN,
    ],
  ])(
    "%s picks the expected cookie name",
    (_label, authUrl, forwardedProto, secure, cookieName) => {
      vi.stubEnv("AUTH_URL", authUrl);
      vi.stubEnv("NEXTAUTH_URL", undefined);
      const requestHeaders = new Headers();
      if (forwardedProto) {
        requestHeaders.set("x-forwarded-proto", forwardedProto);
      }

      const useSecure = shouldUseSecureSessionCookie(requestHeaders);

      expect(useSecure).toBe(secure);
      expect(sessionCookieName(useSecure)).toBe(cookieName);
    },
  );

  it("does not use the request protocol when AUTH_URL is not a URL", () => {
    vi.stubEnv("AUTH_URL", "not a url");
    const requestHeaders = new Headers({ "x-forwarded-proto": "https" });

    expect(shouldUseSecureSessionCookie(requestHeaders)).toBe(false);
  });

  it("uses NEXTAUTH_URL when AUTH_URL is unset, like Auth.js", () => {
    vi.stubEnv("AUTH_URL", undefined);
    vi.stubEnv("NEXTAUTH_URL", "https://hub.example.com");
    const requestHeaders = new Headers({ "x-forwarded-proto": "http" });

    expect(shouldUseSecureSessionCookie(requestHeaders)).toBe(true);
  });
});

describe("configuredSecureCookies", () => {
  it.each([
    [undefined, undefined],
    ["https://hub.example.com", true],
    ["http://localhost:3000", false],
    ["not a url", false],
  ])("AUTH_URL %s gives %s", (authUrl, expected) => {
    expect(configuredSecureCookies(authUrl)).toBe(expected);
  });
});

describe("getAuthJwtFromRequest", () => {
  beforeEach(() => {
    headerBag.delete("x-forwarded-proto");
    headerBag.delete("cookie");
    vi.mocked(getToken).mockReset();
    vi.mocked(TelemetryLogger.warn).mockReset();
    vi.mocked(getToken).mockResolvedValue({ sub: "user" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the secure cookie when the internal proto is http and AUTH_URL is https", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", "https://hub.example.com");
    headerBag.set("x-forwarded-proto", "http");

    // Act
    await getAuthJwtFromRequest();

    // Assert
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true }),
    );
  });

  it("reads the plain cookie when AUTH_URL is http even if the header says https", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", "http://localhost:3000");
    headerBag.set("x-forwarded-proto", "https");
    vi.mocked(getToken).mockResolvedValue(null);

    // Act
    await getAuthJwtFromRequest();

    // Assert
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

  it("reports an invalid token when the cookie is present but unreadable", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", "https://hub.example.com");
    headerBag.set("cookie", `other=1; ${SECURE}.0=chunk; ${SECURE}.1=chunk`);
    vi.mocked(getToken).mockResolvedValue(null);

    // Act
    await getAuthJwtFromRequest();

    // Assert
    expect(TelemetryLogger.warn).toHaveBeenCalledWith(
      "Hub session cookie was not read",
      { secureCookie: true, reason: "session_token_invalid" },
      "auth.logout",
    );
  });

  it("uses the request protocol only when AUTH_URL is unset", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", undefined);
    headerBag.set("x-forwarded-proto", "http");

    // Act
    await getAuthJwtFromRequest();

    // Assert
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: false }),
    );
  });

  it("assumes https like Auth.js when AUTH_URL and the forwarded proto are missing", async () => {
    // Arrange
    vi.stubEnv("AUTH_URL", undefined);

    // Act
    await getAuthJwtFromRequest();

    // Assert
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true }),
    );
  });
});
