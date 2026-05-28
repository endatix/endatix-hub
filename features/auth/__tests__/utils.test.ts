import { describe, expect, it } from "vitest";

import { toAuthRedirectUrl } from "../utils";

describe("toAuthRedirectUrl", () => {
  it("prefixes safe return URLs with the configured base path", () => {
    expect(toAuthRedirectUrl("/forms", "/app")).toBe("/app/forms");
  });

  it("does not prefix return URLs that already include the base path", () => {
    expect(toAuthRedirectUrl("/app/forms", "/app")).toBe("/app/forms");
  });

  it("falls back to the default return URL for unsafe return URLs", () => {
    expect(toAuthRedirectUrl("https://evil.example/forms", "/app")).toBe(
      "/app/forms",
    );
  });

  it("preserves query strings in safe return URLs", () => {
    expect(toAuthRedirectUrl("/forms?tab=recent", "/app")).toBe(
      "/app/forms?tab=recent",
    );
  });
});
