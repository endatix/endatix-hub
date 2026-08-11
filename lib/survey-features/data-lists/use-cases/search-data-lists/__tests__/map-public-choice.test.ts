import { describe, expect, it } from "vitest";
import {
  mapPublicChoiceToSurveyItem,
  resolvePublicChoiceLabel,
} from "../map-public-choice";

describe("mapPublicChoiceToSurveyItem", () => {
  it("passes API label maps through unchanged", () => {
    expect(
      mapPublicChoiceToSurveyItem({
        value: "apple",
        labels: { default: "Apple", bg: "Ябълка" },
      }),
    ).toEqual({
      value: "apple",
      text: { default: "Apple", bg: "Ябълка" },
    });
  });
});

describe("resolvePublicChoiceLabel", () => {
  it("prefers requested catalog locale then default", () => {
    const item = {
      value: "apple",
      labels: { default: "Apple", es: "Manzana" },
    };
    expect(resolvePublicChoiceLabel(item, "es")).toBe("Manzana");
    expect(resolvePublicChoiceLabel(item, "fr")).toBe("Apple");
    expect(resolvePublicChoiceLabel(item)).toBe("Apple");
  });

  it("treats empty, default, and SurveyJS defaultLocale as labels.default", () => {
    const item = {
      value: "728193",
      labels: { default: "Plovdiv", bg: "Пловдив" },
    };
    expect(resolvePublicChoiceLabel(item, "en")).toBe("Plovdiv");
    expect(resolvePublicChoiceLabel(item, "default")).toBe("Plovdiv");
    expect(resolvePublicChoiceLabel(item, "")).toBe("Plovdiv");
    expect(resolvePublicChoiceLabel(item, "bg")).toBe("Пловдив");
  });

  it("falls back to value when default is missing", () => {
    expect(resolvePublicChoiceLabel({ value: "apple", labels: {} })).toBe(
      "apple",
    );
  });
});
