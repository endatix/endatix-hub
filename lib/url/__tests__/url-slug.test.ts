import { describe, expect, it } from "vitest";
import {
  urlSlugFromDisplayName,
  isReservedUrlSlug,
  isValidUrlSlugFormat,
  MAX_URL_SLUG_LENGTH,
  normalizeUrlSlug,
} from "../url-slug";

describe("folder-slug (aligned with OSS UrlSlugNormalizer)", () => {
  it("normalizes display names like OSS FromDisplayName", () => {
    expect(normalizeUrlSlug("Hello World")).toBe("hello-world");
    expect(normalizeUrlSlug("  Mixed_case.Names ")).toBe("mixed-case-names");
  });

  it("rejects leading or trailing hyphens in format check", () => {
    expect(isValidUrlSlugFormat("ab")).toBe(true);
    expect(isValidUrlSlugFormat("-a")).toBe(false);
  });

  it("detects reserved slugs case-insensitively", () => {
    expect(isReservedUrlSlug("templates")).toBe(true);
    expect(isReservedUrlSlug("Templates")).toBe(true);
    expect(isReservedUrlSlug("custom")).toBe(false);
  });

  it("aliases folderSlugFromDisplayName to normalize", () => {
    expect(urlSlugFromDisplayName("Acme Surveys")).toBe(
      normalizeUrlSlug("Acme Surveys"),
    );
  });

  it("documents max length parity with server", () => {
    expect(MAX_URL_SLUG_LENGTH).toBe(128);
  });
});

describe("reserved slugs mirror OSS", () => {
  // Hub-only entries reject slugs the API accepts. Update UrlSlugNormalizer first.
  const OSS_RESERVED = [
    "create",
    "templates",
    "new",
    "api",
    "folders",
    "by-slug",
    "design",
    "analytics",
    "submissions",
    "share",
    "embed",
    "preview",
    "login",
    "signup",
    "logout",
    "register",
    "forgot-password",
    "reset-password",
    "verify-email",
    "email-verification",
    "email-confirmation",
  ];

  it.each(OSS_RESERVED)("reserves %s", (slug) => {
    expect(isReservedUrlSlug(slug)).toBe(true);
  });

  it.each(["t", "admin", "auth", "signin", "forms", "settings"])(
    "does not reserve %s, which the API accepts",
    (slug) => {
      expect(isReservedUrlSlug(slug)).toBe(false);
    },
  );
});
