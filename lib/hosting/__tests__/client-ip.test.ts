// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientIpHeaders, readVisitorIp, withVisitorIp } from "../client-ip";
import { ClientIpEnv } from "../trusted-proxies";

const requestHeaders = vi.hoisted(() => ({
  read: (): Promise<Headers> => Promise.resolve(new Headers()),
}));

vi.mock("next/headers", () => ({
  headers: () => requestHeaders.read(),
}));

function forwardedFor(chain: string): void {
  requestHeaders.read = () =>
    Promise.resolve(new Headers({ [ClientIpHeaders.FORWARDED_FOR]: chain }));
}

function headersThrow(error: Error): void {
  requestHeaders.read = () => Promise.reject(error);
}

describe("withVisitorIp", () => {
  beforeEach(() => {
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("replaces the forwarded chain with the one visitor address", async () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.0/8");
    forwardedFor("1.2.3.4, 203.0.113.9, 10.0.0.5");

    // Act
    const init = await withVisitorIp({
      headers: { Accept: "application/json" },
    });

    // Assert
    const headers = new Headers(init.headers);
    expect(headers.get(ClientIpHeaders.FORWARDED_FOR)).toBe("203.0.113.9");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("leaves the request alone when no proxy is trusted", async () => {
    // Arrange
    forwardedFor("1.2.3.4");
    const original: RequestInit = { method: "POST" };

    // Act
    const init = await withVisitorIp(original);

    // Assert
    expect(init).toBe(original);
  });

  it("leaves the request alone when the trusted list is invalid", async () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "0.0.0.0/0");
    forwardedFor("1.2.3.4");
    const original: RequestInit = {};

    // Act
    const init = await withVisitorIp(original);

    // Assert
    expect(init).toBe(original);
  });
});

describe("readVisitorIp when headers() throws", () => {
  beforeEach(() => {
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.0/8");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["outside a request", "`headers` was called outside a request scope."],
    [
      "inside unstable_cache",
      "Route /forms used `headers()` inside a function cached with `unstable_cache()`.",
    ],
  ])("returns null %s", async (_, message) => {
    // Arrange
    headersThrow(new Error(message));

    // Act
    const ip = await readVisitorIp();

    // Assert
    expect(ip).toBeNull();
  });

  it("rethrows a Next.js dynamic-rendering bailout", async () => {
    // Arrange
    const bailout = Object.assign(new Error("Dynamic server usage"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    headersThrow(bailout);

    // Act
    const read = readVisitorIp();

    // Assert
    await expect(read).rejects.toBe(bailout);
  });
});
