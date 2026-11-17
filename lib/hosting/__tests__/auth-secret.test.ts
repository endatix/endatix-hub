import { describe, expect, it } from "vitest";
import { authSecretError, MIN_AUTH_SECRET_BYTES } from "../auth-secret";

// Values that have appeared in example files. They are already public; listing them
// here pins the hash set in auth-secret.ts against a typo.
const EXAMPLE_VALUES = [
  "QKYuOMS2deIInJt9q6WNmWwuh9QtL7BPKKQfTG/KI48=",
  "edukEVrf9XA1GRDN44/BnB+6xeO1xLUWeKRWS7RWoYo=",
  "DbLkxcw0C5om6n2MFdn6E4sevnT8RzWqcdhQ1FUzhiQ6eGm",
  "Tr9YJeqVsIicqvNgpcn+iJVGq6l4qU95b+GuP/xziMs=",
  "a28110cc8b94c5f3b3c923aa2c9fae4ed50c86ec61debfe6edb3c29947dbb00c",
  "aMfPaLkxa7asa2MFdn6E4sLKOIas1FUzh8&geGm",
];

const STRONG = "nW2v7yQ0bJ+Hk3s9xUe1LmZpRt8cAa4dFg6oIhKqVwE=";

describe("authSecretError", () => {
  it.each([undefined, "", "   "])("refuses a missing value (%j)", (value) => {
    expect(authSecretError(value)).toContain("is required but not set");
  });

  it("names NEXTAUTH_SECRET when only that is set", () => {
    expect(authSecretError(undefined, STRONG)).toContain(
      "rename it to AUTH_SECRET",
    );
  });

  it("refuses a value one byte under the minimum", () => {
    expect(authSecretError("a".repeat(MIN_AUTH_SECRET_BYTES - 1))).toContain(
      `at least ${MIN_AUTH_SECRET_BYTES} bytes`,
    );
  });

  it("accepts a value of exactly the minimum length", () => {
    expect(authSecretError("a".repeat(MIN_AUTH_SECRET_BYTES))).toBeUndefined();
  });

  it("counts bytes, not characters", () => {
    // 11 characters, 33 bytes in UTF-8.
    expect(authSecretError("€".repeat(11))).toBeUndefined();
    // 10 characters, 30 bytes.
    expect(authSecretError("€".repeat(10))).toContain("at least");
  });

  it.each(EXAMPLE_VALUES)("refuses the example value %s", (value) => {
    expect(authSecretError(value)).toContain("example");
  });

  it("refuses an example value with surrounding whitespace", () => {
    expect(authSecretError(` ${EXAMPLE_VALUES[0]}\n`)).toContain("example");
  });

  it("accepts a strong value", () => {
    expect(authSecretError(STRONG)).toBeUndefined();
  });

  it("never echoes the value", () => {
    for (const value of [...EXAMPLE_VALUES, "short-secret"]) {
      expect(authSecretError(value)).not.toContain(value);
    }
  });
});
