import { Helpers } from 'survey-core';
import {
  isSafeRegexPattern,
  MAX_REGEX_VALUE_LENGTH,
} from './pattern-safety';

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
