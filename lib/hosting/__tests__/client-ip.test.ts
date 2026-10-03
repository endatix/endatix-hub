import { describe, expect, it } from "vitest";
import { parseTrustedProxies, resolveClientIp } from "../client-ip";

describe("resolveClientIp", () => {
  it("uses the socket when the peer is not a trusted proxy", () => {
    const ip = resolveClientIp("198.51.100.4", "1.1.1.1", []);
    expect(ip).toBe("198.51.100.4");
  });

  it("ignores a prepended address when the peer is trusted", () => {
    const ip = resolveClientIp(
      "10.0.0.5",
      "1.2.3.4, 203.0.113.9",
      ["10.0.0.0/8"],
    );
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
});

describe("parseTrustedProxies", () => {
  it("rejects a network that trusts every address", () => {
    expect(() => parseTrustedProxies("10.0.0.0/8, 0.0.0.0/0")).toThrow(
      /0\.0\.0\.0\/0/,
    );
  });
});
