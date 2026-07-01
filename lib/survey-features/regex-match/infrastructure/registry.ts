import { FunctionFactory } from 'survey-core';
import { regexMatchFunction } from '../functions';
import { REGEX_MATCH_FUNCTION_NAME } from '../types';

let areGlobalsRegistered = false;

/**
 * Registers regexMatch expression globals.
 * Call once before any SurveyModel or SurveyCreator is created.
 */
export function registerRegexMatchGlobals() {
  if (areGlobalsRegistered) return;

  FunctionFactory.Instance.register(
    REGEX_MATCH_FUNCTION_NAME,
    regexMatchFunction,
    false,
    false,
  );

  areGlobalsRegistered = true;
}
