import { describe, expect, it } from "vitest";
import { formRoutes } from "../form-routes";

describe("formRoutes", () => {
  it("opens a form's Audience, filtered to test participants when asked", () => {
    expect(formRoutes.audience("12")).toBe("/forms/12/audience");
    expect(formRoutes.audience("12", { test: "test" })).toBe(
      "/forms/12/audience?test=test",
    );
  });

  it("opens one participant by their audience member id", () => {
    expect(formRoutes.participant("12", "7")).toBe(
      "/forms/12/audience/participants/7",
    );
  });

  it("opens Submission Details", () => {
    expect(formRoutes.submission("12", "5521")).toBe(
      "/forms/12/submissions/5521",
    );
  });

  it("escapes ids so a stray character cannot change the path", () => {
    expect(formRoutes.participant("12", "7/../x")).toBe(
      "/forms/12/audience/participants/7%2F..%2Fx",
    );
  });
});
