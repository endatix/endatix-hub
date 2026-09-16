import { describe, expect, it } from "vitest";
import { parseSupportReference } from "../support-reference";

describe("parseSupportReference", () => {
  it.each([
    ["an OTel trace id", "4bf92f3577b34da6a3ce929d0e0e4736"],
    ["a W3C traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"],
    ["a dotted id", "a1b2.c3d4.e5f6"],
  ])("accepts %s", (_label, value) => {
    expect(parseSupportReference(value)).toBe(value);
  });

  /** It arrives in the URL and is rendered on a branded page. */
  it.each([
    ["markup", "<script>alert(1)</script>"],
    ["spaces", "not a trace id"],
    ["too short", "abc"],
    ["oversized", "a".repeat(200)],
    ["empty", ""],
    ["slashes", "../../etc/passwd"],
  ])("rejects %s", (_label, value) => {
    expect(parseSupportReference(value)).toBeNull();
  });

  it("rejects missing input", () => {
    expect(parseSupportReference(undefined)).toBeNull();
    expect(parseSupportReference(null)).toBeNull();
  });
});
