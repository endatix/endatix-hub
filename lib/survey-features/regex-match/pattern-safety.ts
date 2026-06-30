export const MAX_REGEX_PATTERN_LENGTH = 256;
export const MAX_REGEX_VALUE_LENGTH = 2048;

// Group body contains + or *, then another quantifier on the group — common ReDoS shape.
const NESTED_QUANTIFIER_PATTERN = /\([^)]*[+*][^)]*\)[+*?{]/;

export function isSafeRegexPattern(pattern: string): boolean {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    return false;
  }

  return !NESTED_QUANTIFIER_PATTERN.test(pattern);
}
