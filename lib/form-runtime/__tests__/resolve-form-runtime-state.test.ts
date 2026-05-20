import { describe, expect, it } from "vitest";
import { resolveFormRuntimeState } from "../resolve-form-runtime-state";

describe("resolveFormRuntimeState", () => {
  it("returns null when formId is missing", () => {
    expect(resolveFormRuntimeState({ templateId: "t1" })).toBeNull();
    expect(resolveFormRuntimeState({ formId: "" })).toBeNull();
    expect(resolveFormRuntimeState({ formId: "   " })).toBeNull();
  });

  it("returns the same object reference when formId is present", () => {
    const state = { formId: "form-1", submissionId: "sub-1" };
    const resolved = resolveFormRuntimeState(state);
    expect(resolved).toBe(state);
  });
});
