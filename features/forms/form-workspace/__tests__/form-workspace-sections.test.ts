import { describe, expect, it } from "vitest";
import {
  getActiveFormWorkspaceSection,
  getFormDesignHref,
  getFormDesignReturn,
  getFormWorkspaceSections,
  isFormDesignPrimary,
} from "../form-workspace-sections";

describe("getFormWorkspaceSections", () => {
  it("lists only the always-on sections when no optional section is enabled", () => {
    // Arrange
    const flags = { analytics: false, audience: false };

    // Act
    const sections = getFormWorkspaceSections("f1", flags);

    // Assert
    expect(sections.map((section) => section.id)).toEqual([
      "overview",
      "submissions",
      "settings",
    ]);
  });

  it("adds audience and analytics in workspace order with form-scoped links", () => {
    // Arrange
    const flags = { analytics: true, audience: true };

    // Act
    const sections = getFormWorkspaceSections("f1", flags);

    // Assert
    expect(sections.map((section) => section.href)).toEqual([
      "/forms/f1",
      "/forms/f1/submissions",
      "/forms/f1/audience",
      "/forms/f1/analytics",
      "/forms/f1/settings",
    ]);
  });
});

describe("getActiveFormWorkspaceSection", () => {
  it.each([
    ["/forms/f1", "overview"],
    ["/forms/f1/", "overview"],
    ["/forms/f1/submissions/s9/edit", "submissions"],
    ["/forms/f1/audience", "audience"],
  ])("maps %s to %s", (pathname, expected) => {
    // Act & Assert
    expect(getActiveFormWorkspaceSection(pathname, "f1")).toBe(expected);
  });

  it.each(["/forms", "/forms/f10/audience", "/forms/f1/design"])(
    "has no active section for %s",
    (pathname) => {
      // Act & Assert
      expect(getActiveFormWorkspaceSection(pathname, "f1")).toBeUndefined();
    },
  );
});

describe("getFormDesignHref", () => {
  it.each([
    [undefined, "/forms/f1/design"],
    ["overview", "/forms/f1/design"],
    ["audience", "/forms/f1/design?from=audience"],
  ] as const)("opens the designer from %s as %s", (from, expected) => {
    // Act & Assert
    expect(getFormDesignHref("f1", from)).toBe(expected);
  });
});

describe("getFormDesignReturn", () => {
  it("returns to the section the designer was opened from", () => {
    // Act
    const target = getFormDesignReturn("f1", "audience");

    // Assert
    expect(target).toEqual({ href: "/forms/f1/audience", label: "Audience" });
  });

  it.each([undefined, "design", "//evil.example", "../settings"])(
    "returns to the overview for %s",
    (from) => {
      // Act & Assert
      expect(getFormDesignReturn("f1", from)).toEqual({
        href: "/forms/f1",
        label: "Overview",
      });
    },
  );
});

describe("isFormDesignPrimary", () => {
  it.each([
    ["overview", true],
    ["submissions", true],
    ["settings", true],
    ["audience", false],
  ] as const)("is %s → %s", (page, expected) => {
    // Act & Assert
    expect(isFormDesignPrimary(page)).toBe(expected);
  });
});
