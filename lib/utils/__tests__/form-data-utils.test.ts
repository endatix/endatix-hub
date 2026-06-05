import { describe, expect, it } from "vitest";
import { getStringFormValue, getStringFormValues } from "../form-data-utils";

describe("form data utils", () => {
  it("returns string form values and falls back for files", () => {
    const formData = new FormData();
    formData.set("name", "Reviewer");
    formData.set("file", new File(["content"], "file.txt"));

    expect(getStringFormValue(formData, "name")).toBe("Reviewer");
    expect(getStringFormValue(formData, "file")).toBe("");
    expect(getStringFormValue(formData, "missing")).toBe("");
  });

  it("filters non-string values from multi-value fields", () => {
    const formData = new FormData();
    formData.append("roles", "Creator");
    formData.append("roles", new File(["content"], "role.txt"));
    formData.append("roles", "Reviewer");

    expect(getStringFormValues(formData, "roles")).toEqual([
      "Creator",
      "Reviewer",
    ]);
  });
});
