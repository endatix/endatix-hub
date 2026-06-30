import { Helpers } from 'survey-core';

export function regexMatchFunction(params: unknown[]): boolean {
  if (!Array.isArray(params) || params.length === 0) return false;

  const [value, pattern, flags] = params;
  if (typeof pattern !== 'string' || pattern.length === 0) return false;
  if (Helpers.isValueEmpty(value)) return false;

  try {
    const regex = new RegExp(
      pattern,
      typeof flags === 'string' ? flags : undefined,
    );
    return regex.test(String(value));
  } catch {
    return false;
  }
}
