import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClientIpHeaders,
  readVisitorIp,
  visitorIpHeaders,
} from "../visitor-ip.server";
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

describe("visitorIpHeaders", () => {
  beforeEach(() => {
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "");
  });

  it("is the one visitor address as X-Forwarded-For", async () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.0/8");
    forwardedFor("1.2.3.4, 203.0.113.9, 10.0.0.5");

    // Act
    const outbound = await visitorIpHeaders();

    // Assert
    expect(outbound).toEqual({
      [ClientIpHeaders.FORWARDED_FOR]: "203.0.113.9",
    });
  });

  it("is nothing when no proxy is trusted", async () => {
    // Arrange
    forwardedFor("1.2.3.4");

    // Act
    const outbound = await visitorIpHeaders();

    // Assert
    expect(outbound).toBeUndefined();
  });

  it("is nothing when the trusted list is invalid", async () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "0.0.0.0/0");
    forwardedFor("1.2.3.4");

    // Act
    const outbound = await visitorIpHeaders();

    // Assert
    expect(outbound).toBeUndefined();
  });
});

describe("readVisitorIp when headers() throws", () => {
  beforeEach(() => {
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.0/8");
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
