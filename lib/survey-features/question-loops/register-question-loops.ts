import { FunctionFactory, Serializer } from "survey-core";
import { getDynamicLoopDefinition } from "./dynamic-loop-question";
import { LOOP_EXIT_FUNCTION_NAME } from "./types";

let areGlobalsRegistered = false;

/**
 * Registers the question loops globals that are indipendant of the survey model & creator instances. E.g functions, serializer's properties, etc.
 */
export function registerQuestionLoopsGlobals() {
  if (areGlobalsRegistered) return;

  const loopQuestionDefinition = getDynamicLoopDefinition();

  Serializer.addProperties(
    loopQuestionDefinition.type,
    loopQuestionDefinition.properties,
  );

  FunctionFactory.Instance.register(
    LOOP_EXIT_FUNCTION_NAME,
    loopQuestionDefinition.functions[LOOP_EXIT_FUNCTION_NAME],
    false,
    false,
  );

  areGlobalsRegistered = true;
}
