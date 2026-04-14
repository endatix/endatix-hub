import { FunctionFactory } from "survey-core";
import {
  anyAnsweredByPrefixFunction,
  anyAnsweredFunction,
} from "../functions";
import {
  ANY_ANSWERED_BY_PREFIX_FUNCTION_NAME,
  ANY_ANSWERED_FUNCTION_NAME,
} from "../types";

let areGlobalsRegistered = false;

/**
 * Registers any-answered expression globals.
 * Call once before any SurveyModel or SurveyCreator is created.
 */
export function registerAnyAnsweredGlobals() {
  if (areGlobalsRegistered) return;

  FunctionFactory.Instance.register(
    ANY_ANSWERED_FUNCTION_NAME,
    anyAnsweredFunction,
    false,
    false,
  );

  FunctionFactory.Instance.register(
    ANY_ANSWERED_BY_PREFIX_FUNCTION_NAME,
    anyAnsweredByPrefixFunction,
    false,
    false,
  );

  areGlobalsRegistered = true;
}
