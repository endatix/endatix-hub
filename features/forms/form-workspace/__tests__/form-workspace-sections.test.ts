import { describe, expect, it } from "vitest";
import {
  getFormDesignHref,
  getFormDesignReturn,
  getFormWorkspaceSections,
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
    expect(target).toEqual({
      href: "/forms/f1/audience",
      label: "Participants",
    });
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
