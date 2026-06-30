export function regexMatchFunction(params: unknown[]): boolean {
  const [value, pattern, flags] = params ?? [];
  if (typeof pattern !== 'string' || pattern.length === 0) return false;
  if (value == null || value === '') return false;

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
