import { describe, expect, it } from "vitest";

import { getPublicAssetPath } from "../public-assets";

describe("getPublicAssetPath", () => {
  it("prefixes absolute public asset paths with the configured base path", () => {
    expect(getPublicAssetPath("/assets/icons/icon.svg", "/app")).toBe(
      "/app/assets/icons/icon.svg",
    );
  });

  it("does not duplicate the base path when it is already present", () => {
    expect(getPublicAssetPath("/app/assets/icons/icon.svg", "/app")).toBe(
      "/app/assets/icons/icon.svg",
    );
  });

  it("normalizes relative public asset paths", () => {
    expect(getPublicAssetPath("assets/icons/icon.svg", "/app")).toBe(
      "/app/assets/icons/icon.svg",
    );
  });

  it("returns an empty path for blank input", () => {
    expect(getPublicAssetPath("   ", "/app")).toBe("");
  });

  it("rejects external URLs", () => {
    expect(() =>
      getPublicAssetPath("https://example.com/assets/icon.svg", "/app"),
    ).toThrow("Absolute URIs are not allowed for internal public assets.");
  });

  it("rejects protocol-relative URLs", () => {
    expect(() => getPublicAssetPath("//example.com/icon.svg", "/app")).toThrow(
      "Protocol-relative URLs are not allowed.",
    );
  });

  it("rejects query strings and hashes to keep the helper path-only", () => {
    expect(() => getPublicAssetPath("/assets/icon.svg?v=1", "/app")).toThrow(
      "Public asset paths must not include query strings or hashes.",
    );
    expect(() => getPublicAssetPath("/assets/icon.svg#logo", "/app")).toThrow(
      "Public asset paths must not include query strings or hashes.",
    );
  });
});
