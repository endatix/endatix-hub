import { SourceSelectionModes } from "@/lib/survey-features/question-loops/types";
import { describe, expect, it } from "vitest";
import { resolveCarryForwardSelectionMode } from "../map-carry-forward-mode";

describe("resolveCarryForwardSelectionMode", () => {
  it("maps native SurveyJS mode values", () => {
    expect(resolveCarryForwardSelectionMode("all")).toBe(
      SourceSelectionModes.All,
    );
    expect(resolveCarryForwardSelectionMode("selected")).toBe(
      SourceSelectionModes.SelectedOnly,
    );
    expect(resolveCarryForwardSelectionMode("unselected")).toBe(
      SourceSelectionModes.UnselectedOnly,
    );
  });

  it("defaults to all when mode is missing", () => {
    expect(resolveCarryForwardSelectionMode(undefined)).toBe(
      SourceSelectionModes.All,
    );
  });

  it("defaults to all when mode is a non-string value", () => {
    expect(resolveCarryForwardSelectionMode(1 as never)).toBe(
      SourceSelectionModes.All,
    );
    expect(resolveCarryForwardSelectionMode(true as never)).toBe(
      SourceSelectionModes.All,
    );
  });

  it("supports legacy loop labels in JSON", () => {
    expect(resolveCarryForwardSelectionMode("Selected Only")).toBe(
      SourceSelectionModes.SelectedOnly,
    );
    expect(resolveCarryForwardSelectionMode("Unselected Only")).toBe(
      SourceSelectionModes.UnselectedOnly,
    );
    expect(resolveCarryForwardSelectionMode("All")).toBe(
      SourceSelectionModes.All,
    );
  });
});
