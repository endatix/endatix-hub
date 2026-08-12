import { describe, expect, it } from "vitest";
import { SourceSelectionModes } from "@/lib/survey-features/question-loops/types";
import type { QuestionSelectBase } from "survey-core";
import {
  isLazyLoadedChoiceSource,
  resolveEffectiveCarryForwardModeForSource,
} from "../resolve-effective-carry-forward-mode";

function sourceWith(lazy: boolean | undefined): QuestionSelectBase {
  return { choicesLazyLoadEnabled: lazy } as QuestionSelectBase & {
    choicesLazyLoadEnabled?: boolean;
  };
}

describe("isLazyLoadedChoiceSource", () => {
  it("is true only when choicesLazyLoadEnabled is true", () => {
    expect(isLazyLoadedChoiceSource(sourceWith(true))).toBe(true);
    expect(isLazyLoadedChoiceSource(sourceWith(false))).toBe(false);
    expect(isLazyLoadedChoiceSource(sourceWith(undefined))).toBe(false);
  });
});

describe("resolveEffectiveCarryForwardModeForSource", () => {
  it("forces Selected Only for lazy sources when All or Unselected is requested", () => {
    const lazy = sourceWith(true);

    expect(
      resolveEffectiveCarryForwardModeForSource(
        lazy,
        SourceSelectionModes.All,
      ),
    ).toBe(SourceSelectionModes.SelectedOnly);
    expect(
      resolveEffectiveCarryForwardModeForSource(
        lazy,
        SourceSelectionModes.UnselectedOnly,
      ),
    ).toBe(SourceSelectionModes.SelectedOnly);
  });

  it("keeps Selected Only when already requested on a lazy source", () => {
    expect(
      resolveEffectiveCarryForwardModeForSource(
        sourceWith(true),
        SourceSelectionModes.SelectedOnly,
      ),
    ).toBe(SourceSelectionModes.SelectedOnly);
  });

  it("honors All / Selected / Unselected for inline (non-lazy) sources", () => {
    const inline = sourceWith(false);

    expect(
      resolveEffectiveCarryForwardModeForSource(
        inline,
        SourceSelectionModes.All,
      ),
    ).toBe(SourceSelectionModes.All);
    expect(
      resolveEffectiveCarryForwardModeForSource(
        inline,
        SourceSelectionModes.SelectedOnly,
      ),
    ).toBe(SourceSelectionModes.SelectedOnly);
    expect(
      resolveEffectiveCarryForwardModeForSource(
        inline,
        SourceSelectionModes.UnselectedOnly,
      ),
    ).toBe(SourceSelectionModes.UnselectedOnly);
  });
});
