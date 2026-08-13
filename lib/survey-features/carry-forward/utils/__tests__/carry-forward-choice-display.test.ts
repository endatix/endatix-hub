import { describe, expect, it } from "vitest";
import { ItemValue } from "survey-core";
import {
  choiceDisplayFingerprint,
  hasCatalogLabelMap,
  haveCarryForwardChoicesChanged,
  preferResolvedChoiceLabel,
} from "../carry-forward-choice-display";

describe("carry-forward-choice-display", () => {
  it("uses SurveyJS hasText / hasNonDefaultText; identity text===value is not a catalog label", () => {
    // No stored text — ItemValue.text falls back to value.
    expect(new ItemValue("2510911").hasText).toBe(false);
    expect(hasCatalogLabelMap(new ItemValue("2510911"))).toBe(false);

    // Explicit text equal to value (same omit rule as SurveyJS JSON serialization).
    expect(hasCatalogLabelMap(new ItemValue("2510911", "2510911"))).toBe(false);
    expect(hasCatalogLabelMap(new ItemValue("Jordan", "Jordan"))).toBe(false);

    // Monolingual distinct default text (hasText, !hasNonDefaultText).
    expect(hasCatalogLabelMap(new ItemValue("2510911", "Sevilla"))).toBe(true);

    const mapped = new ItemValue("2510911", "Sevilla");
    mapped.locText.setJson({ default: "Seville", es: "Sevilla" });
    expect(mapped.locText.hasNonDefaultText()).toBe(true);
    expect(hasCatalogLabelMap(mapped)).toBe(true);

    // SurveyJS collapses getJson for monolingual maps; detection must not rely on that.
    const monolingual = new ItemValue("sku-42", "sku-42");
    monolingual.locText.setJson({ default: "Widget" });
    expect(monolingual.locText.getJson()).toBe("Widget");
    expect(monolingual.hasText).toBe(true);
    expect(monolingual.locText.hasNonDefaultText()).toBe(false);
    expect(hasCatalogLabelMap(monolingual)).toBe(true);
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

  it("copies catalog maps onto identity incoming choices", () => {
    const existing = new ItemValue("2510911", "Sevilla");
    existing.locText.setJson({ default: "Seville", es: "Sevilla" });
    const incoming = new ItemValue("2510911");
    incoming.group = "priority";
    incoming.randomize = false;

    const merged = preferResolvedChoiceLabel(
      incoming,
      new Map([["2510911", existing]]),
    );

    expect(merged.text).toBe("Seville");
    expect(merged.locText.getJson()).toEqual({
      default: "Seville",
      es: "Sevilla",
    });
    // Label copy must not wipe grouping / randomization from the incoming copy.
    expect(merged.group).toBe("priority");
    expect(merged.randomize).toBe(false);
  });

  it("does not treat flat value===label text as a catalog map to prefer", () => {
    const existing = new ItemValue("Jordan", "Jordan");
    const incoming = new ItemValue("Jordan", "Jordan");

    expect(existing.hasText).toBe(true);
    expect(hasCatalogLabelMap(existing)).toBe(false);

    const merged = preferResolvedChoiceLabel(
      incoming,
      new Map([["Jordan", existing]]),
    );

    expect(merged).toBe(incoming);
  });

  it("falls back to flat text when locText setJson is a no-op", () => {
    const existing = new ItemValue("2510911", "Sevilla");
    existing.locText.setJson({ default: "Seville", es: "Sevilla" });
    const incoming = new ItemValue("2510911");
    incoming.locText.setJson = () => {
      // Simulate environments where setJson does not apply the locale map.
    };

    const merged = preferResolvedChoiceLabel(
      incoming,
      new Map([["2510911", existing]]),
    );

    expect(merged.text).toBe("Seville");
  });

  it("detects grouping and media field changes", () => {
    const current = [new ItemValue("A", "Alpha")];
    const next = [new ItemValue("A", "Alpha")];
    next[0]!.group = "priority";
    next[0]!.randomize = false;

    expect(haveCarryForwardChoicesChanged(current, next)).toBe(true);

    const withImage = [new ItemValue("A", "Alpha")];
    (withImage[0] as ItemValue & { imageLink?: string }).imageLink = "/a.png";
    expect(haveCarryForwardChoicesChanged(current, withImage)).toBe(true);
  });
});
