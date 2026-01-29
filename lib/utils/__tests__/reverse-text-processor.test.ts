import { describe, it, expect } from "vitest";
import { extractReplacedTokens } from "@/lib/questions/personalization/reverse-text-processor";
import type { Token } from "@/lib/questions/personalization/reverse-text-processor";
import { Result } from "@/lib/result";
import type { ResultType } from "@/lib/result";

function getReplacedValues(result: ResultType<Token[]>): string[] | null {
  if (!Result.isSuccess(result)) return null;
  return result.value
    .filter((t: Token) => t.isVariable)
    .map((t: Token) => t.replacedValue ?? "");
}

function getTokens(result: ResultType<Token[]>): Token[] | null {
  return Result.isSuccess(result) ? result.value : null;
}

describe("extractReplacedTokens", () => {
  it("returns validation error if no variables", () => {
    const result = extractReplacedTokens("Hello world!", "Hello world!");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toMatch(/no personalized tokens/i);
    }
  });

  it("extracts a single variable", () => {
    const result = extractReplacedTokens("Hello {name}!", "Hello John!");
    expect(Result.isSuccess(result)).toBe(true);
    expect(getReplacedValues(result)).toEqual(["John"]);
  });

  it("extracts multiple variables", () => {
    const result = extractReplacedTokens(
      "Hi {first}, meet {second}.",
      "Hi Alice, meet Bob.",
    );
    expect(Result.isSuccess(result)).toBe(true);
    expect(getReplacedValues(result)).toEqual(["Alice", "Bob"]);
  });

  it("extracts adjacent variables as a single merged variable", () => {
    // With the new logic, adjacent variables are merged into one
    const result = extractReplacedTokens("A{one}{two}B", "A12B");
    expect(Result.isSuccess(result)).toBe(true);
    expect(getReplacedValues(result)).toEqual(["12"]);
  });

  it("extracts variable at start", () => {
    const result = extractReplacedTokens("{greeting}, world!", "Hello, world!");
    expect(Result.isSuccess(result)).toBe(true);
    expect(getReplacedValues(result)).toEqual(["Hello"]);
  });

  it("extracts variable at end", () => {
    const result = extractReplacedTokens("Bye {name}", "Bye Sam");
    expect(Result.isSuccess(result)).toBe(true);
    expect(getReplacedValues(result)).toEqual(["Sam"]);
  });

  it("returns error if static text does not match", () => {
    const result = extractReplacedTokens("Hello {name}!", "Hi John!");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toMatch(/static text mismatch/i);
    }
  });

  it("returns error if next static text is missing", () => {
    const result = extractReplacedTokens("A{one}B{two}C", "A1B2X");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toMatch(/cannot find next static text/i);
    }
  });

  it("handles empty variable value", () => {
    const result = extractReplacedTokens("Hello {name}!", "Hello !");
    expect(Result.isSuccess(result)).toBe(true);
    expect(getReplacedValues(result)).toEqual([""]);
  });

  describe("token id", () => {
    it("assigns a numeric id to every token", () => {
      const result = extractReplacedTokens(
        "Hi {first}, meet {second}.",
        "Hi Alice, meet Bob.",
      );
      const tokens = getTokens(result);
      expect(tokens).not.toBeNull();
      expect(tokens).toHaveLength(5); // "Hi ", "{first}", ", meet ", "{second}", "."
      tokens!.forEach((token) => {
        expect(token).toHaveProperty("id");
        expect(typeof token.id).toBe("number");
        expect(Number.isInteger(token.id)).toBe(true);
        expect(token.id).toBeGreaterThanOrEqual(0);
      });
    });

    it("assigns different ids to tokens with the same value (position-based)", () => {
      // Two static "A" and two variable tokens with same name "x" at different positions
      const result = extractReplacedTokens("A{x}A{x}A", "A1A2A");
      const tokens = getTokens(result);
      expect(tokens).not.toBeNull();
      const ids = tokens!.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("assigns deterministic ids for the same extraction", () => {
      const result1 = extractReplacedTokens("Hello {name}!", "Hello John!");
      const result2 = extractReplacedTokens("Hello {name}!", "Hello John!");
      const tokens1 = getTokens(result1);
      const tokens2 = getTokens(result2);
      expect(tokens1).not.toBeNull();
      expect(tokens2).not.toBeNull();
      expect(tokens1!.length).toBe(tokens2!.length);
      tokens1!.forEach((t1, i) => {
        expect(t1.id).toBe(tokens2![i].id);
      });
    });
  });
});
