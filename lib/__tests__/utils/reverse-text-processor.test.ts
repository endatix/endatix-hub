import { describe, it, expect } from "vitest";
import { extractReplacedTokens } from "@/lib/questions/personalization/reverse-text-processor";
import type { Token } from "@/lib/questions/personalization/reverse-text-processor";
import { Result } from "@/lib/result";
import type { ResultType } from "@/lib/result";

// Helper to extract only the replaced values for easier assertions
function getReplacedValues(result: ResultType<Token[]>): string[] | null {
  if (!Result.isSuccess(result)) return null;
  return result.value
    .filter((t: Token) => t.isVariable)
    .map((t: Token) => t.replacedValue ?? "");
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
});
