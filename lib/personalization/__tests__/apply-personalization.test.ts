import { describe, expect, it } from "vitest";
import { applyPersonalizationToModel } from "../apply-personalization";

describe("applyPersonalizationToModel", () => {
  it("overwrites a URL variable with the frozen value", () => {
    const values = new Map<string, unknown>([["city", "from-url"]]);
    const model = {
      setVariable: (name: string, value: unknown) => values.set(name, value),
    };

    applyPersonalizationToModel(model, {
      variables: { city: "03. MIDWEST - COLUMBUS", age: 65 },
    });

    expect(values.get("city")).toBe("03. MIDWEST - COLUMBUS");
    expect(values.get("age")).toBe(65);
  });

  it("leaves the model alone when there is no snapshot", () => {
    const values = new Map<string, unknown>();
    const model = {
      setVariable: (name: string, value: unknown) => values.set(name, value),
    };

    applyPersonalizationToModel(model, null);

    expect(values.size).toBe(0);
  });
});
