import { describe, it, expect } from "vitest";
import { getDisplayName, getInitials } from "../user-utils";

describe("getInitials", () => {
  it("returns first and last initial when userName has multiple words", () => {
    expect(getInitials("John Doe", "")).toBe("JD");
    expect(getInitials("  Jane Smith  ", "jane@x.com")).toBe("JS");
  });

  it("returns first two characters when userName is a single word", () => {
    expect(getInitials("John", "")).toBe("JO");
    expect(getInitials("Ab", "")).toBe("AB");
  });

  it("falls back to email when userName is empty", () => {
    expect(getInitials("", "john@example.com")).toBe("JO");
    expect(getInitials(undefined, "tech@endatix.com")).toBe("TE");
  });

  it("uses userName when non-empty (including email-shaped userName)", () => {
    expect(getInitials("Alice", "bob@x.com")).toBe("AL");
    expect(getInitials("tech@endatix.com", "other@x.com")).toBe("TE");
    expect(getInitials("", "alice.bob@x.com")).toBe("AL");
  });

  it("returns ? when both userName and email are empty or missing", () => {
    expect(getInitials("", "")).toBe("?");
    expect(getInitials(undefined, undefined)).toBe("?");
    expect(getInitials("  ", "  ")).toBe("?");
  });
});

describe("getDisplayName", () => {
  it("returns plain userName unchanged when it has no @", () => {
    expect(getDisplayName("John Doe", "tech@x.com")).toBe("John Doe");
    expect(getDisplayName("  Alice  ", "alice@x.com")).toBe("Alice");
  });

  it("derives name from userName when userName is email-shaped", () => {
    expect(getDisplayName("tech@endatix.com", "other@x.com")).toBe("Tech");
    expect(getDisplayName("JOHN.DOE@company.com", "")).toBe("John.doe");
  });

  it("derives name from email when userName is empty", () => {
    expect(getDisplayName("", "tech@endatix.com")).toBe("Tech");
    expect(getDisplayName(undefined, "tech@endatix.com")).toBe("Tech");
  });

  it("lowercases rest of local part when deriving from email", () => {
    expect(getDisplayName("", "TECH@endatix.com")).toBe("Tech");
    expect(getDisplayName("", "JOHN.DOE@x.com")).toBe("John.doe");
  });

  it("returns empty string when both userName and email are empty or missing", () => {
    expect(getDisplayName("", "")).toBe("");
    expect(getDisplayName(undefined, undefined)).toBe("");
    expect(getDisplayName("  ", "  ")).toBe("");
  });

  it("returns empty string when email has no local part", () => {
    expect(getDisplayName("", "@domain.com")).toBe("");
  });

  it("prefers userName over email", () => {
    expect(getDisplayName("Jane Doe", "tech@x.com")).toBe("Jane Doe");
    expect(getDisplayName("admin@hub.com", "user@other.com")).toBe("Admin");
  });
});
