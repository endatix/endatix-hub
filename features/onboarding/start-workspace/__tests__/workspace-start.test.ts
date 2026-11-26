import { describe, expect, it } from "vitest";
import { readWorkspaceChoice } from "../workspace-choice";

describe("workspace start", () => {
  it.each(["working", "retryable"])("recognizes %s only without an editor destination", (state) => {
    expect(readWorkspaceChoice({ state, choices: [], formId: null })).toEqual({ kind: state });
    expect(readWorkspaceChoice({ state, choices: [], formId: "42" })).toBeNull();
    expect(readWorkspaceChoice({ state, choices: [] })).toBeNull();
  });

  it.each(["42", null])("recognizes ready with explicit formId %s", (formId) => {
    expect(readWorkspaceChoice({ state: "ready", choices: [], formId })).toEqual({ kind: "complete", formId });
    expect(readWorkspaceChoice({ state: "ready", choices: [] })).toBeNull();
  });

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
