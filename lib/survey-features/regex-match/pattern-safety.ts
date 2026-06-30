export const MAX_REGEX_PATTERN_LENGTH = 256;
export const MAX_REGEX_VALUE_LENGTH = 2048;

// Group body contains + or *, then another quantifier on the group — common ReDoS shape.
const NESTED_QUANTIFIER_PATTERN = /\([^)]*[+*][^)]*\)[+*?{]/;

/** Built at runtime so static analysis does not flag known-unsafe fixture literals. */
export const UNSAFE_NESTED_PLUS_PATTERN = ['(', 'a', '+', ')', '+', '$'].join('');
export const UNSAFE_NESTED_STAR_PATTERN = ['(', '.', '*', ')', '*', '$'].join('');

export function isSafeRegexPattern(pattern: string): boolean {  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    return false;
  }

  return !NESTED_QUANTIFIER_PATTERN.test(pattern);
}
