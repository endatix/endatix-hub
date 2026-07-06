import { describe, expect, it } from "vitest";
import { ItemValue } from "survey-core";
import { splitByPriority } from "../split-by-priority";

function choice(value: string, text?: string): ItemValue {
  return new ItemValue(value, text ?? value);
}

describe("splitByPriority", () => {
  it("returns all choices in rest when priority values are empty", () => {
    const choices = [choice("a"), choice("b")];

    const result = splitByPriority(choices, []);

    expect(result.priority).toEqual([]);
    expect(result.rest).toEqual(choices);
  });

  it("orders priority choices by configured priority values", () => {
    const choices = [choice("a"), choice("b"), choice("c")];

    const result = splitByPriority(choices, ["c", "a"]);

    expect(result.priority.map((item) => item.value)).toEqual(["c", "a"]);
    expect(result.rest.map((item) => item.value)).toEqual(["b"]);
  });

  it("deduplicates repeated priority values", () => {
    const choices = [choice("a"), choice("b")];

    const result = splitByPriority(choices, ["a", "a", "b"]);

    expect(result.priority.map((item) => item.value)).toEqual(["a", "b"]);
  });
});
