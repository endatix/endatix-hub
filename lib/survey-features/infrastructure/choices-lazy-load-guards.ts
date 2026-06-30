import type { Question } from "survey-core";

export type ChoicesLazyLoadGuard = (
  question: Question,
  filter: string,
) => boolean;

const guards = new Map<string, ChoicesLazyLoadGuard>();

export function registerChoicesLazyLoadGuard(
  id: string,
  guard: ChoicesLazyLoadGuard,
): void {
  guards.set(id, guard);
}

export function unregisterChoicesLazyLoadGuard(id: string): void {
  guards.delete(id);
}

export function shouldSuppressChoicesLazyLoad(
  question: Question,
  filter: string,
): boolean {
  return Array.from(guards.values()).some((guard) => guard(question, filter));
}

export function clearChoicesLazyLoadGuardsForTests(): void {
  guards.clear();
}

export type ChoicesLazyLoadCompletedHandler = (
  question: Question,
  filter: string,
  itemCount: number,
  success: boolean,
) => void;

const completedHandlers = new Map<string, ChoicesLazyLoadCompletedHandler>();

export function registerChoicesLazyLoadCompletedHandler(
  id: string,
  handler: ChoicesLazyLoadCompletedHandler,
): void {
  completedHandlers.set(id, handler);
}

export function unregisterChoicesLazyLoadCompletedHandler(id: string): void {
  completedHandlers.delete(id);
}

export function notifyChoicesLazyLoadCompleted(
  question: Question,
  filter: string,
  itemCount: number,
  success = true,
): void {
  completedHandlers.forEach((handler) =>
    handler(question, filter, itemCount, success),
  );
}

export function clearChoicesLazyLoadCompletedHandlersForTests(): void {
  completedHandlers.clear();
}
