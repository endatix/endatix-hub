import { describe, expect, it } from "vitest";

import {
  getPublicAssetPath,
  InvalidPublicAssetPathError,
} from "../public-assets";

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
    const action = () =>
      getPublicAssetPath("https://example.com/assets/icon.svg", "/app");

    expect(action).toThrow(InvalidPublicAssetPathError);
    expect(action).toThrow(
      "Absolute URIs are not allowed for internal public assets.",
    );
  });

  it("rejects protocol-relative URLs", () => {
    const action = () => getPublicAssetPath("//example.com/icon.svg", "/app");

    expect(action).toThrow(InvalidPublicAssetPathError);
    expect(action).toThrow("Protocol-relative URLs are not allowed.");
  });

  it("rejects query strings and hashes to keep the helper path-only", () => {
    const queryAction = () =>
      getPublicAssetPath("/assets/icon.svg?v=1", "/app");
    const hashAction = () =>
      getPublicAssetPath("/assets/icon.svg#logo", "/app");

    expect(queryAction).toThrow(InvalidPublicAssetPathError);
    expect(queryAction).toThrow(
      "Public asset paths must not include query strings or hashes.",
    );
    expect(hashAction).toThrow(InvalidPublicAssetPathError);
    expect(hashAction).toThrow(
      "Public asset paths must not include query strings or hashes.",
    );
  });
});
