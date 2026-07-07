import { FunctionFactory, Serializer } from "survey-core";
import { getDynamicLoopDefinition } from "../dynamic-loop-question";
import { registerLoopPriorityLazyProvider } from "./loop-priority-lazy-provider";
import { LOOP_EXIT_FUNCTION_NAME } from "../types";

let areGlobalsRegistered = false;

/**
 * Registers the question loops globals (Serializer, FunctionFactory).
 * Call once before any SurveyModel or SurveyCreator is created.
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

  registerLoopPriorityLazyProvider();

  areGlobalsRegistered = true;
}
