import { describe, expect, it } from "vitest";
import { parseExportRetryTarget } from "../export-retry-target";

const VALID = "/export-pdf/1549448896642547712?token=abc.123.x.def";

describe("parseExportRetryTarget", () => {
  it("accepts an export path carrying a token", () => {
    expect(parseExportRetryTarget(VALID)).toBe(VALID);
  });

  /**
   * The cookie is unsigned by design, so this is the whole security boundary:
   * a forged value must not be able to produce an off-site or scripted target.
   */
  it.each([
    ["absolute URL", "https://evil.com/export-pdf/1?token=a"],
    ["protocol-relative", "//evil.com/export-pdf/1?token=a"],
    ["javascript URI", "javascript:alert(1)"],
    ["data URI", "data:text/html,<script>alert(1)</script>"],
    ["backslash trick", "/\\evil.com/export-pdf/1?token=a"],
    ["not an export path", "/admin/users?token=a"],
    ["traversal out of the export path", "/export-pdf/1/../../admin?token=a"],
    ["non-numeric id", "/export-pdf/abc?token=a"],
    ["export path without a token", "/export-pdf/1"],
    ["empty token", "/export-pdf/1?token="],
    ["empty", ""],
    ["whitespace", "   "],
  ])("rejects %s", (_label, value) => {
    expect(parseExportRetryTarget(value)).toBeNull();
  });

  it("rejects an absurdly long value", () => {
    expect(parseExportRetryTarget(`${VALID}&pad=${"a".repeat(4000)}`)).toBeNull();
  });

  it("rejects missing input", () => {
    expect(parseExportRetryTarget(undefined)).toBeNull();
    expect(parseExportRetryTarget(null)).toBeNull();
  });
});
