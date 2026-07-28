import { CARRY_FORWARD_QUESTION_TYPES } from "./constants";

const BUILT_IN_TYPES = new Set<string>(CARRY_FORWARD_QUESTION_TYPES);

/**
 * Question types that opted in at runtime — code-owned custom questions
 * registering themselves once their Serializer class exists.
 *
 * Kept separate from the built-in list so the registry's one-time-init guard
 * can keep asserting only over types it owns.
 */
const optedInTypes = new Set<string>();

export function addSupportedCarryForwardQuestionType(
  questionType: string,
): void {
  if (BUILT_IN_TYPES.has(questionType)) {
    return;
  }
  optedInTypes.add(questionType);
}

export function isSupportedCarryForwardQuestionType(
  questionType: string,
): boolean {
  return BUILT_IN_TYPES.has(questionType) || optedInTypes.has(questionType);
}

/** Built-in types first, then opted-in ones. */
export function getSupportedCarryForwardQuestionTypes(): string[] {
  return [...CARRY_FORWARD_QUESTION_TYPES, ...optedInTypes];
}

export function getOptedInCarryForwardQuestionTypes(): string[] {
  return [...optedInTypes];
}

export function resetOptedInCarryForwardQuestionTypesForTests(): void {
  optedInTypes.clear();
}
