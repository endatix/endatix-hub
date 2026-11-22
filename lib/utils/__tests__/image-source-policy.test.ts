import { describe, expect, it } from "vitest";
import {
  decideImageSource,
  MAX_DATA_IMAGE_BASE64_LENGTH,
  type ImageSourcePolicy,
} from "../image-source-policy";

const policy: ImageSourcePolicy = {
  allowedHosts: [
    "acme.blob.core.windows.net",
    "cdn.example.com",
    "s3.example.com:9443",
  ],
  ownOrigin: "https://hub.example.com",
};

// Synthetic image bytes: a JPEG / PNG signature, not a real picture.
const JPEG_BASE64 = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0,
]).toString("base64");
const PNG_BASE64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]).toString("base64");

const decide = (src: string | undefined) => decideImageSource(src, policy);

describe("decideImageSource", () => {
  describe("https hosts", () => {
    it.each([
      [
        "an allowed host",
        "https://acme.blob.core.windows.net/content/logo.png?sv=1&sig=x",
      ],
      ["an allowed host in upper case", "HTTPS://CDN.EXAMPLE.COM/a.png"],
      [
        "an allowed host with its listed port",
        "https://s3.example.com:9443/a.png",
      ],
    ])("keeps %s", (_name, src) => {
      expect(decide(src).kind).toBe("keep");
    });

    it.each([
      [
        "another host",
        "https://images.other.example/a.png",
        "images.other.example",
      ],
      [
        "a suffix trick",
        "https://acme.blob.core.windows.net.attacker.test/a.png",
        "acme.blob.core.windows.net.attacker.test",
      ],
      [
        "a subdomain of an allowed host",
        "https://evil.cdn.example.com/a.png",
        "evil.cdn.example.com",
      ],
      [
        "an allowed host on an unlisted port",
        "https://s3.example.com/a.png",
        "s3.example.com",
      ],
    ])("turns %s into a link", (_name, src, host) => {
      expect(decide(src)).toEqual({
        kind: "link",
        href: new URL(src).href,
        host,
      });
    });

    it("links every https host when nothing is allowed", () => {
      expect(
        decideImageSource("https://cdn.example.com/a.png", { allowedHosts: [] })
          .kind,
      ).toBe("link");
    });
  });

  describe("always rejected", () => {
    it.each([
      ["http", "http://cdn.example.com/a.png"],
      ["protocol-relative", "//cdn.example.com/a.png"],
      ["relative", "/api/auth/logout"],
      ["scheme-less", "api/auth/logout"],
      ["javascript", "javascript:alert(1)"],
      ["userinfo", "https://user:pw@cdn.example.com/a.png"],
      ["username only", "https://user@cdn.example.com/a.png"],
      ["an IPv4 literal", "https://203.0.113.7/a.png"],
      ["an IPv6 literal", "https://[2001:db8::1]/a.png"],
      ["localhost", "https://localhost/a.png"],
      ["a .localhost name", "https://hub.localhost/a.png"],
      ["the Hub's own origin", "https://hub.example.com/api/auth/logout"],
      ["empty", ""],
      ["missing", undefined],
    ])("drops %s", (_name, src) => {
      expect(decide(src)).toEqual({ kind: "drop" });
    });

    it("drops a listed IP, localhost or own host", () => {
      const listed: ImageSourcePolicy = {
        allowedHosts: ["203.0.113.7", "localhost", "hub.example.com"],
        ownOrigin: "https://hub.example.com",
      };

      for (const src of [
        "https://203.0.113.7/a.png",
        "https://localhost/a.png",
        "https://hub.example.com/a.png",
      ]) {
        expect(decideImageSource(src, listed)).toEqual({ kind: "drop" });
      }
    });
  });

  describe("data images", () => {
    it.each([
      ["jpeg", `data:image/jpeg;base64,${JPEG_BASE64}`],
      ["png", `data:image/png;base64,${PNG_BASE64}`],
      ["gif", `data:image/gif;base64,${PNG_BASE64}`],
      ["webp", `data:image/webp;base64,${PNG_BASE64}`],
    ])("keeps an inline %s", (_name, src) => {
      expect(decide(src)).toEqual({ kind: "keep", src });
    });

    it.each([
      ["svg", `data:image/svg+xml;base64,${PNG_BASE64}`],
      ["svg as text", "data:image/svg+xml,<svg onload=alert(1)>"],
      ["html", `data:text/html;base64,${PNG_BASE64}`],
      ["not base64", "data:image/png,rawbytes"],
      [
        "junk after the base64",
        `data:image/png;base64,${PNG_BASE64}"onerror="x`,
      ],
      ["a space inside the base64", `data:image/png;base64,${PNG_BASE64} AAAA`],
      ["upper-case type", `data:IMAGE/PNG;base64,${PNG_BASE64}`],
    ])("drops a data URI with %s", (_name, src) => {
      expect(decide(src)).toEqual({ kind: "drop" });
    });

    it("keeps an image at exactly 100 KB of base64", () => {
      const src = `data:image/png;base64,${"A".repeat(MAX_DATA_IMAGE_BASE64_LENGTH)}`;
      expect(decide(src).kind).toBe("keep");
    });

    it("marks an image over 100 KB of base64 as too large", () => {
      const src = `data:image/png;base64,${"A".repeat(MAX_DATA_IMAGE_BASE64_LENGTH + 4)}`;
      expect(decide(src)).toEqual({ kind: "too-large" });
    });
  });
});
