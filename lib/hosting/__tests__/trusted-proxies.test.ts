// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ClientIpEnv,
  parseTrustedProxies,
  resolveClientIp,
  TrustedProxiesConfigError,
  trustedProxiesFromEnv,
} from "../trusted-proxies";

const resolve = (chain: string | null, list: string) =>
  resolveClientIp(chain, parseTrustedProxies(list));

describe("resolveClientIp", () => {
  it("ignores a prepended address in front of a trusted proxy", () => {
    expect(resolve("1.2.3.4, 203.0.113.9, 10.0.0.5", "10.0.0.0/8")).toBe(
      "203.0.113.9",
    );
  });

  it("returns the rightmost hop when it is not a trusted proxy", () => {
    expect(resolve("8.8.8.8, 203.0.113.9", "10.0.0.0/8")).toBe("203.0.113.9");
  });

  it("returns null when there is no chain", () => {
    expect(resolve(null, "10.0.0.0/8")).toBeNull();
  });

  it("returns null when every hop is a trusted proxy", () => {
    expect(resolve("10.0.0.7, 10.0.0.5", "10.0.0.0/8")).toBeNull();
  });

  it("strips the port a proxy appends to a hop", () => {
    expect(
      resolve("203.0.113.9:52134, [fd00::5]:443", "10.0.0.5, fd00::/8"),
    ).toBe("203.0.113.9");
  });

  it("stops at a malformed hop instead of skipping past it", () => {
    expect(resolve("203.0.113.9, 10.0.0., 10.0.0.5", "10.0.0.0/24")).toBeNull();
  });

  it("does not resolve a hop with leading-zero octets", () => {
    expect(resolve("010.000.000.001, 10.0.0.5", "10.0.0.0/8")).toBeNull();
  });

  it("matches an IPv6 hop against an IPv6 network", () => {
    expect(resolve("2001:db8::7, fd00::1", "fd00::/8")).toBe("2001:db8::7");
  });

  it.each([
    ["an expanded IPv6 entry", "fd00:0:0:0:0:0:0:1", "2001:db8::7, fd00::1"],
    ["a bracketed IPv6 network", "[fd00::]/8", "2001:db8::7, fd00::5"],
    [
      "an IPv4 network, for an IPv4-mapped hop",
      "10.0.0.0/8",
      "2001:db8::7, ::ffff:10.0.0.5",
    ],
  ])("skips a proxy listed as %s", (_, list, chain) => {
    expect(resolve(chain, list)).toBe("2001:db8::7");
  });

  it("sends an IPv6 visitor in compressed form", () => {
    expect(resolve("2001:0DB8:0:0:0:0:0:0007, 10.0.0.5", "10.0.0.5")).toBe(
      "2001:db8::7",
    );
  });

  it("sends an IPv4-mapped visitor as IPv4", () => {
    expect(resolve("::ffff:203.0.113.9, 10.0.0.5", "10.0.0.5")).toBe(
      "203.0.113.9",
    );
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

  it.each([
    "10.0.0.0/33",
    "fd00::/129",
    "proxy.local",
    "10.0.0.0/8/1",
    "10.0.0/8",
    "fe80::%eth0/64",
    "::ffff:10.0.0.0/104",
    "[2001:db8::1",
  ])("rejects the malformed entry %s", (entry) => {
    expect(() => parseTrustedProxies(entry)).toThrow(
      new RegExp(ClientIpEnv.TRUSTED_PROXIES),
    );
  });

  it("accepts addresses and networks of both families", () => {
    // Act
    const trusted = parseTrustedProxies(
      " 10.0.0.0/8 , 192.0.2.1, fd00::/8, [::1] ",
    );

    // Assert
    expect(trusted.size).toBe(4);
    expect(
      ["10.9.9.9", "192.0.2.1", "fd12::1", "::1"].every((ip) =>
        trusted.has(ip),
      ),
    ).toBe(true);
    expect(trusted.has("192.0.2.2")).toBe(false);
  });

  it("treats an unset value as an empty list", () => {
    expect(parseTrustedProxies(undefined).size).toBe(0);
  });
});

describe("trustedProxiesFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null for an invalid list", () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "0.0.0.0/0");

    // Act
    const trusted = trustedProxiesFromEnv();

    // Assert
    expect(trusted).toBeNull();
  });

  it("parses the list again when the value changes", () => {
    // Arrange
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.5");
    const first = trustedProxiesFromEnv();
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.6");

    // Act
    const second = trustedProxiesFromEnv();

    // Assert
    expect(first?.has("10.0.0.5")).toBe(true);
    expect(second?.has("10.0.0.5")).toBe(false);
    expect(trustedProxiesFromEnv()).toBe(second);
  });
});
