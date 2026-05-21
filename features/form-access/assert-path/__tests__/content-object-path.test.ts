import { describe, expect, it } from "vitest";
import {
  isContentObjectPath,
  isFormContentObjectPath,
  isTemplateContentObjectPath,
} from "../content-object-path";

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

  it("matches form content by form id", () => {
    expect(isFormContentObjectPath("f/form-1/logo.png", "form-1")).toBe(true);
    expect(isFormContentObjectPath("f/form-2/logo.png", "form-1")).toBe(false);
    expect(isFormContentObjectPath("t/form-1/logo.png", "form-1")).toBe(false);
  });

  it("matches template content by template id", () => {
    expect(
      isTemplateContentObjectPath("t/template-1/logo.svg", "template-1"),
    ).toBe(true);
    expect(
      isTemplateContentObjectPath("t/template-2/logo.svg", "template-1"),
    ).toBe(false);
    expect(
      isTemplateContentObjectPath("f/template-1/logo.svg", "template-1"),
    ).toBe(false);
  });
});
