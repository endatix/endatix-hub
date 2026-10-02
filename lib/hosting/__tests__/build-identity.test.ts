import { describe, expect, it } from "vitest";
import { formatBuildIdentity } from "../build-identity";

describe("formatBuildIdentity", () => {
  it("is the version for a release", () => {
    // Act & Assert
    expect(
      formatBuildIdentity({ version: "0.8.0", branch: null, commit: "abc" }),
    ).toBe("0.8.0");
  });

  it("is branch @ commit for any other build", () => {
    // Act & Assert
    expect(
      formatBuildIdentity({ version: null, branch: "main", commit: "abc123" }),
    ).toBe("main @ abc123");
  });

  it("says so when nothing is known", () => {
    // Act & Assert
    expect(formatBuildIdentity(null)).toBe("unavailable");
    expect(
      formatBuildIdentity({ version: null, branch: null, commit: null }),
    ).toBe("unavailable");
  });
});
