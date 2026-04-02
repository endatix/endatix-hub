import { describe, expect, it } from "vitest";
import { formatPageTitle } from "../../../ui/details/submission-details-nav";

describe("submission-toc", () => {
  describe("formatPageTitle", () => {
    it("should format page title with 'Page:' prefix and zero-padded index for regular titles", () => {
      expect(formatPageTitle(0, "Personal Info")).toBe(
        "Page: 01: Personal Info",
      );
    });

    it("should handle single digit indices correctly", () => {
      expect(formatPageTitle(4, "Contact Details")).toBe(
        "Page: 05: Contact Details",
      );
    });

    it("should return auto-generated page names as-is (e.g., page1, page2)", () => {
      expect(formatPageTitle(0, "page1")).toBe("page1");
      expect(formatPageTitle(1, "page2")).toBe("page2");
      expect(formatPageTitle(10, "page10")).toBe("page10");
    });

    it("should be case insensitive for auto-generated page names", () => {
      expect(formatPageTitle(0, "PAGE1")).toBe("PAGE1");
      expect(formatPageTitle(0, "Page1")).toBe("Page1");
    });
  });
});
