import { describe, expect, it } from "vitest";
import { applyPersonalizationToModel } from "../apply-personalization";

describe("applyPersonalizationToModel", () => {
  it("overwrites a URL variable with the frozen value", () => {
    const values = new Map<string, unknown>([["ciudad", "from-url"]]);
    const model = {
      setVariable: (name: string, value: unknown) => values.set(name, value),
    };

    applyPersonalizationToModel(model, {
      variables: { ciudad: "03. ANTIOQUIA - MEDELLIN", edac: 65 },
    });

    expect(values.get("ciudad")).toBe("03. ANTIOQUIA - MEDELLIN");
    expect(values.get("edac")).toBe(65);
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
