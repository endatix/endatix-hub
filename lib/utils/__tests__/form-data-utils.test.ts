import { describe, expect, it } from "vitest";
import { getBooleanFormValue } from "../form-data-utils";

describe("getBooleanFormValue", () => {
  it("is true for checkbox true/on", () => {
    // Arrange
    const formData = new FormData();
    formData.set("includeTestSubmissions", "true");

    // Assert
    expect(getBooleanFormValue(formData, "includeTestSubmissions")).toBe(true);

    formData.set("includeTestSubmissions", "on");
    expect(getBooleanFormValue(formData, "includeTestSubmissions")).toBe(true);
  });

  it("is false when the field is missing or another value", () => {
    // Assert
    expect(getBooleanFormValue(new FormData(), "includeTestSubmissions")).toBe(
      false,
    );
  });
});
