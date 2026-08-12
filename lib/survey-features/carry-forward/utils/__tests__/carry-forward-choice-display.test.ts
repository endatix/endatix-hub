import { describe, expect, it } from "vitest";
import { ItemValue } from "survey-core";
import {
  choiceDisplayFingerprint,
  haveCarryForwardChoicesChanged,
  isUnresolvedChoiceLabel,
  preferResolvedChoiceLabel,
} from "../carry-forward-choice-display";

describe("carry-forward-choice-display", () => {
  it("treats text equal to value as unresolved", () => {
    expect(isUnresolvedChoiceLabel(new ItemValue("2510911"))).toBe(true);
    expect(isUnresolvedChoiceLabel(new ItemValue("2510911", "2510911"))).toBe(
      true,
    );
    expect(isUnresolvedChoiceLabel(new ItemValue("2510911", "Sevilla"))).toBe(
      false,
    );
  });

  it("detects label-only upgrades as a change", () => {
    const current = [new ItemValue("2510911", "2510911")];
    const next = [new ItemValue("2510911", "Sevilla")];

    expect(haveCarryForwardChoicesChanged(current, next)).toBe(true);
    expect(haveCarryForwardChoicesChanged(next, next)).toBe(false);
  });

  it("includes locText maps in the fingerprint", () => {
    const withFlat = new ItemValue("2510911", "Sevilla");
    const withMap = new ItemValue("2510911", "Sevilla");
    withMap.locText.setJson({ default: "Seville", es: "Sevilla" });

    expect(choiceDisplayFingerprint(withFlat)).not.toBe(
      choiceDisplayFingerprint(withMap),
    );
    expect(haveCarryForwardChoicesChanged([withFlat], [withMap])).toBe(true);
  });

  it("copies resolved labels onto unresolved incoming choices", () => {
    const existing = new ItemValue("2510911", "Sevilla");
    existing.locText.setJson({ default: "Seville", es: "Sevilla" });
    const incoming = new ItemValue("2510911");

    const merged = preferResolvedChoiceLabel(
      incoming,
      new Map([["2510911", existing]]),
    );

    expect(merged.text).toBe("Seville");
    expect(merged.locText.getJson()).toEqual({
      default: "Seville",
      es: "Sevilla",
    });
  });
});
