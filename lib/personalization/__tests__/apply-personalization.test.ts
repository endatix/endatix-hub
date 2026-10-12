import { describe, expect, it, vi } from "vitest";
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

  it("re-runs an empty calculated default after the variables land", () => {
    const rerun = vi.fn();
    const model = {
      setVariable: () => {},
      getAllQuestions: () => [
        {
          defaultValueExpression: "{age} * 12",
          isEmpty: () => true,
          runDefaultValueExpression: rerun,
        },
        {
          defaultValueExpression: "{city}",
          isEmpty: () => false,
          runDefaultValueExpression: rerun,
        },
      ],
    };

    applyPersonalizationToModel(model, { variables: { age: 65 } });

    expect(rerun).toHaveBeenCalledOnce();
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
