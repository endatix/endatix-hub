import { describe, expect, it } from "vitest";

import { normalizeBasePath, withBasePath } from "../base-path";

describe("normalizeBasePath", () => {
  it("normalizes empty and root base paths to an empty string", () => {
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath("/")).toBe("");
    expect(normalizeBasePath("   ")).toBe("");
  });

  it("adds a leading slash and removes a trailing slash", () => {
    expect(normalizeBasePath("app")).toBe("/app");
    expect(normalizeBasePath("/app/")).toBe("/app");
    expect(normalizeBasePath("/app//")).toBe("/app");
    expect(normalizeBasePath("/app///")).toBe("/app");
  });
});

describe("withBasePath", () => {
  it("prefixes paths with the configured base path", () => {
    expect(withBasePath("/forms", "/app")).toBe("/app/forms");
  });

  it("does not duplicate the configured base path", () => {
    expect(withBasePath("/app/forms", "/app")).toBe("/app/forms");
    expect(withBasePath("/app?tab=recent", "/app")).toBe("/app?tab=recent");
  });

  it("normalizes paths without a leading slash", () => {
    expect(withBasePath("assets/icons/icon.svg", "/app")).toBe(
      "/app/assets/icons/icon.svg",
    );
  });

  it("preserves query strings and hashes for callers that allow them", () => {
    expect(withBasePath("/forms?tab=recent", "/app")).toBe(
      "/app/forms?tab=recent",
    );
    expect(withBasePath("/forms#recent", "/app")).toBe("/app/forms#recent");
  });

  it("returns an empty string for blank paths", () => {
    expect(withBasePath("   ", "/app")).toBe("");
  });
});
