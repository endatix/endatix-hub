// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ClientIpEnv,
  ClientIpHeaders,
  parseTrustedProxies,
  resolveClientIp,
  TrustedProxiesConfigError,
  withVisitorIp,
} from "../client-ip";

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.value,
}));

describe("resolveClientIp", () => {
  it("uses the socket when the peer is not a trusted proxy", () => {
    const ip = resolveClientIp("198.51.100.4", "1.1.1.1", []);
    expect(ip).toBe("198.51.100.4");
  });

  it("ignores a prepended address when the peer is trusted", () => {
    const ip = resolveClientIp("10.0.0.5", "1.2.3.4, 203.0.113.9", [
      "10.0.0.0/8",
    ]);
    expect(ip).toBe("203.0.113.9");
  });

  it("sends nothing when the socket is hidden and no proxy is trusted", () => {
    expect(resolveClientIp(null, "1.2.3.4", [])).toBeNull();
  });

  it("walks the chain when the socket is hidden and proxies are trusted", () => {
    const ip = resolveClientIp(null, "8.8.8.8, 203.0.113.9", ["10.0.0.0/8"]);
    expect(ip).toBe("203.0.113.9");
  });

  it("treats an IPv4-mapped address as the IPv4 peer", () => {
    const ip = resolveClientIp("::ffff:198.51.100.4", "1.1.1.1", []);
    expect(ip).toBe("198.51.100.4");
  });

  it("strips the port a proxy appends to an IPv4 hop", () => {
    // Arrange
    const chain = "203.0.113.9:52134, 10.0.0.5:443";

    // Act
    const ip = resolveClientIp(null, chain, ["10.0.0.5"]);

    // Assert
    expect(ip).toBe("203.0.113.9");
  });

  it("does not trust a malformed hop through a CIDR", () => {
    const ip = resolveClientIp(null, "203.0.113.9, 10.0.0.", ["10.0.0.0/24"]);
    expect(ip).toBeNull();
  });

  it("matches an IPv6 hop against an IPv6 network", () => {
    const ip = resolveClientIp(null, "2001:db8::7, fd00::1", ["fd00::/8"]);
    expect(ip).toBe("2001:db8::7");
  });
});

describe("parseTrustedProxies", () => {
  it.each(["0.0.0.0/0", "::/0", "10.0.0.0/00", "0::/0"])(
    "rejects %s, which trusts every address",
    (entry) => {
      expect(() => parseTrustedProxies(`10.0.0.0/8, ${entry}`)).toThrow(
        TrustedProxiesConfigError,
      );
    },
  );

  it.each(["10.0.0.0/33", "proxy.local", "10.0.0.0/8/1", "10.0.0/8"])(
    "rejects the malformed entry %s",
    (entry) => {
      expect(() => parseTrustedProxies(entry)).toThrow(
        new RegExp(ClientIpEnv.TRUSTED_PROXIES),
      );
    },
  );

  it("accepts addresses and networks of both families", () => {
    // Arrange
    const value = " 10.0.0.0/8 , 192.0.2.1, fd00::/8, [::1] ";

    // Act
    const entries = parseTrustedProxies(value);

    // Assert
    expect(entries).toEqual(["10.0.0.0/8", "192.0.2.1", "fd00::/8", "[::1]"]);
  });
});

describe("withVisitorIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    requestHeaders.value = new Headers();
  });

  it("replaces the forwarded chain with the one visitor address", async () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.0/8");
    requestHeaders.value = new Headers({
      [ClientIpHeaders.FORWARDED_FOR]: "1.2.3.4, 203.0.113.9, 10.0.0.5",
    });

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
    requestHeaders.value = new Headers({
      [ClientIpHeaders.FORWARDED_FOR]: "1.2.3.4",
    });
    const original: RequestInit = { method: "POST" };

    // Act
    const init = await withVisitorIp(original);

    // Assert
    expect(init).toBe(original);
  });

  it("sends nothing when the trusted list is invalid", async () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "0.0.0.0/0");
    requestHeaders.value = new Headers({
      [ClientIpHeaders.FORWARDED_FOR]: "1.2.3.4",
    });

    // Act
    const init = await withVisitorIp({});

    // Assert
    expect(new Headers(init.headers).has(ClientIpHeaders.FORWARDED_FOR)).toBe(
      false,
    );
  });
});
