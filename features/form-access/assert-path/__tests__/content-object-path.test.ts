import { describe, expect, it } from "vitest";
import { isContentObjectPath } from "../content-object-path";

describe("content object paths", () => {
  it("allows form and template content namespaces", () => {
    expect(isContentObjectPath("f/form-1/logo.png")).toBe(true);
    expect(isContentObjectPath("t/template-1/logo.svg")).toBe(true);
  });

  it("rejects non-content namespaces", () => {
    expect(isContentObjectPath("logo.png")).toBe(false);
    expect(isContentObjectPath("x/form-1/logo.png")).toBe(false);
    expect(isContentObjectPath("forms/form-1/logo.png")).toBe(false);
  });
});
