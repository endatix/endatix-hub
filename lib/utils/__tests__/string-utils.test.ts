import { describe, expect, it } from "vitest";
import { stringifyUnknown, stripTrailingNewlines } from "../string-utils";

describe("stripTrailingNewlines", () => {
  it("strips trailing LF and CRLF runs", () => {
    expect(stripTrailingNewlines("a\n\n")).toBe("a");
    expect(stripTrailingNewlines("a\r\n\r\n")).toBe("a");
  });

  it("leaves a trailing CR without LF", () => {
    expect(stripTrailingNewlines("a\r")).toBe("a\r");
  });

  it("returns the original string when there is no trailing newline", () => {
    expect(stripTrailingNewlines("a")).toBe("a");
  });
});

describe("stringifyUnknown", () => {
  it("renders nullish and scalars without [object Object]", () => {
    // Act & Assert
    expect(stringifyUnknown(null)).toBe("null");
    expect(stringifyUnknown(undefined)).toBe("undefined");
    expect(stringifyUnknown("hello")).toBe("hello");
    expect(stringifyUnknown(0)).toBe("0");
    expect(stringifyUnknown(false)).toBe("false");
    expect(stringifyUnknown(BigInt("9007199254740993"))).toBe(
      "9007199254740993",
    );
    expect(stringifyUnknown(Symbol("sym"))).toContain("sym");
  });

  it("uses Error.message", () => {
    expect(stringifyUnknown(new Error("broke"))).toBe("broke");
    expect(stringifyUnknown(new Error(""))).toBe("");
  });

  it("JSON-encodes objects and arrays; circular becomes [Circular]", () => {
    expect(stringifyUnknown({ foo: "bar" })).toBe('{"foo":"bar"}');
    expect(stringifyUnknown([1, "a"])).toBe('[1,"a"]');

    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(stringifyUnknown(circular)).toBe("[Circular]");
  });

  it("preferKey uses a scalar (or null) field, else JSON of the object", () => {
    expect(
      stringifyUnknown(
        { message: "custom", code: 1 },
        { preferKey: "message" },
      ),
    ).toBe("custom");
    expect(stringifyUnknown({ message: "" }, { preferKey: "message" })).toBe(
      "",
    );
    expect(stringifyUnknown({ message: 123 }, { preferKey: "message" })).toBe(
      "123",
    );
    expect(stringifyUnknown({ message: null }, { preferKey: "message" })).toBe(
      "null",
    );
    expect(stringifyUnknown({ message: false }, { preferKey: "message" })).toBe(
      "false",
    );
    expect(
      stringifyUnknown({ message: { nested: true } }, { preferKey: "message" }),
    ).toBe('{"message":{"nested":true}}');
    expect(stringifyUnknown({ code: 500 }, { preferKey: "message" })).toBe(
      '{"code":500}',
    );
  });

  it("honours null, undefined, Error, and circular replacements", () => {
    expect(stringifyUnknown(null, { nullBehavior: "" })).toBe("");
    expect(stringifyUnknown(undefined, { undefinedBehavior: "" })).toBe("");
    expect(
      stringifyUnknown(new Error("broke"), { errorBehavior: "emptyString" }),
    ).toBe("");
    expect(
      stringifyUnknown(new Error("broke"), { errorBehavior: "toString" }),
    ).toBe("Error: broke");

    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(stringifyUnknown(circular, { circularBehavior: "" })).toBe("");
  });
});
