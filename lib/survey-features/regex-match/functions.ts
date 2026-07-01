import { Helpers } from 'survey-core';
import {
  isSafeRegexPattern,
  MAX_REGEX_VALUE_LENGTH,
} from './pattern-safety';

/**
 * SurveyJS expression handler for regexMatch(value, pattern, flags?).
 *
 * Runs synchronous RegExp.test() on the browser main thread whenever SurveyJS
 * evaluates visibleIf / enableIf (and similar). Form authors can supply
 * arbitrary patterns, so a malicious or careless pattern can block the UI.
 *
 * Mitigations in pattern-safety.ts (length caps, nested-quantifier heuristic,
 * invalid-syntax guard) are defense-in-depth only — not a full ReDoS guarantee.
 * Follow-up: safe-regex analyzer, Creator-time expression validation, author docs.
 */
export function regexMatchFunction(params: unknown[]): boolean {
  if (!Array.isArray(params) || params.length === 0) return false;

  const [value, pattern, flags] = params;
  if (typeof pattern !== 'string' || pattern.length === 0) return false;
  if (!isSafeRegexPattern(pattern)) return false;
  if (Helpers.isValueEmpty(value)) return false;

  const valueString = String(value);
  if (valueString.length > MAX_REGEX_VALUE_LENGTH) return false;

  try {
    const regex = new RegExp(
      pattern,
      typeof flags === 'string' ? flags : undefined,
    );
    return regex.test(valueString);
  } catch {
    return false;
  }
}
