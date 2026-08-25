import { describe, expect, it } from "vitest";
import { stripTrailingNewlines } from "../string-utils";

describe("stripTrailingNewlines", () => {
  it("strips trailing LF and CRLF runs", () => {
    expect(stripTrailingNewlines("a\n\n")).toBe("a");
    expect(stripTrailingNewlines("a\r\n\r\n")).toBe("a");
  });

  it("leaves a trailing CR without LF", () => {
    expect(stripTrailingNewlines("a\r")).toBe("a\r");
  });

  it("returns the original string when there is no trailing newline", () => {
    expect(stripTrailingNewlines("a")).toBe("a");
  });
});
