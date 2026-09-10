import { describe, expect, it } from "vitest";
import {
  getBooleanFormValue,
  getStringFormValue,
  getStringFormValues,
} from "../form-data-utils";

describe("form data utils", () => {
  it("returns string form values and falls back for files", () => {
    // Arrange
    const formData = new FormData();
    formData.set("name", "Reviewer");
    formData.set("file", new File(["content"], "file.txt"));

    // Assert
    expect(getStringFormValue(formData, "name")).toBe("Reviewer");
    expect(getStringFormValue(formData, "file")).toBe("");
    expect(getStringFormValue(formData, "missing")).toBe("");
  });

  it("filters non-string values from multi-value fields", () => {
    // Arrange
    const formData = new FormData();
    formData.append("roles", "Creator");
    formData.append("roles", new File(["content"], "role.txt"));
    formData.append("roles", "Reviewer");

    // Assert
    expect(getStringFormValues(formData, "roles")).toEqual([
      "Creator",
      "Reviewer",
    ]);
  });

  describe("getBooleanFormValue", () => {
    it("is true for checkbox true/on", () => {
      // Arrange
      const formData = new FormData();
      formData.set("includeTestSubmissions", "true");

      // Assert
      expect(getBooleanFormValue(formData, "includeTestSubmissions")).toBe(
        true,
      );

      formData.set("includeTestSubmissions", "on");
      expect(getBooleanFormValue(formData, "includeTestSubmissions")).toBe(
        true,
      );
    });

    it("is false when the field is missing or another value", () => {
      // Assert
      expect(
        getBooleanFormValue(new FormData(), "includeTestSubmissions"),
      ).toBe(false);
    });
  });
});
