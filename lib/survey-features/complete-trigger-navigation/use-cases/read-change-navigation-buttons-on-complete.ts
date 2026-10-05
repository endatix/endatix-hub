/**
 * Omitted and any value other than `false` keep today's behavior: Next
 * becomes Complete as soon as a Complete trigger's expression is true.
 */
export function readChangeNavigationButtonsOnComplete(value: unknown): boolean {
  return value !== false;
}
