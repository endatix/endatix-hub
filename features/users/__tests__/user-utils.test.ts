import { describe, it, expect } from "vitest";
import { Session } from "next-auth";
import {
  getDisplayName,
  getInitials,
  getCurrentUserInfo,
} from "../../users/user-utils";

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

describe("getCurrentUserInfo", () => {
  it("returns not logged in when session is null", () => {
    const result = getCurrentUserInfo(null);
    expect(result.isLoggedIn).toBe(false);
    expect(result.name).toBe("Not logged in");
    expect(result.email).toBe("");
    expect(result.id).toBe("");
    expect(result.displayName).toBe("?");
    expect(result.initials).toBe("?");
  });

  it("returns not logged in when session.user is null", () => {
    const result = getCurrentUserInfo({} as Session);
    expect(result.isLoggedIn).toBe(false);
    expect(result.name).toBe("Not logged in");
  });

  it("returns user info when session has user with name and email", () => {
    const session = {
      user: { name: "John Doe", email: "john@example.com", id: "123" },
    } as Session;
    const result = getCurrentUserInfo(session);
    expect(result.isLoggedIn).toBe(true);
    expect(result.name).toBe("John Doe");
    expect(result.email).toBe("john@example.com");
    expect(result.id).toBe("123");
    expect(result.displayName).toBe("John Doe");
    expect(result.initials).toBe("JD");
  });

  it("handles user with only email", () => {
    const session = {
      user: { email: "tech@endatix.com", id: "456" },
    } as Session;
    const result = getCurrentUserInfo(session);
    expect(result.isLoggedIn).toBe(true);
    expect(result.name).toBe("");
    expect(result.email).toBe("tech@endatix.com");
    expect(result.id).toBe("456");
    expect(result.displayName).toBe("Tech");
    expect(result.initials).toBe("TE");
  });

  it("handles user with email-shaped name", () => {
    const session = {
      user: { name: "admin@hub.com", email: "other@x.com", id: "789" },
    } as Session;
    const result = getCurrentUserInfo(session);
    expect(result.isLoggedIn).toBe(true);
    expect(result.name).toBe("admin@hub.com");
    expect(result.displayName).toBe("Admin");
    expect(result.initials).toBe("AD");
  });

  it("handles null/undefined user properties", () => {
    const session = {
      user: { name: null, email: null, id: null },
    } as unknown as Session;
    const result = getCurrentUserInfo(session);
    expect(result.isLoggedIn).toBe(true);
    expect(result.name).toBe("");
    expect(result.email).toBe("");
    expect(result.id).toBe("");
    expect(result.displayName).toBe("");
    expect(result.initials).toBe("?");
  });
});
