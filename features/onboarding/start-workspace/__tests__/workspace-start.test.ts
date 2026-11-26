import { describe, expect, it } from "vitest";
import { readWorkspaceChoice } from "../workspace-choice";

describe("workspace start", () => {
  it("offers blank only when the workspace actually offers it", () => {
    // Act & Assert
    expect(readWorkspaceChoice({ state: "offered", choices: ["blank"], formId: null })).toEqual({
      kind: "offer",
    });
    expect(readWorkspaceChoice({ state: "offered", choices: [], formId: null })).toBeNull();
  });

  it("resumes the chosen form and leaves a deleted draft complete", () => {
    // Act & Assert
    expect(readWorkspaceChoice({ state: "blank", choices: [], formId: "9007199254740993" })).toEqual({
      kind: "complete",
      formId: "9007199254740993",
    });
    expect(readWorkspaceChoice({ state: "blank", choices: [], formId: null })).toEqual({
      kind: "complete",
      formId: null,
    });
    expect(readWorkspaceChoice({ state: "blank", choices: [], formId: "../settings" })).toBeNull();
  });
});
