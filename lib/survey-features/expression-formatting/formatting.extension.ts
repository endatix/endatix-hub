import { FunctionFactory } from "survey-core";
import { expressionFormattingRegistry } from "./formatters";

let areFunctionsRegistered = false;
const IS_ASYNC = false;
const USE_CACHE = false;

/**
 * Registers the formatting extension.
 */
export function registerFormattingExtension(): void {
  if (areFunctionsRegistered) return;

  const factory = FunctionFactory.Instance;
  for (const { name, func } of expressionFormattingRegistry) {
    factory.register(name, func, IS_ASYNC, USE_CACHE);
  }

  areFunctionsRegistered = true;
}

export const expressionFormattingExtension = {
  onInit: registerFormattingExtension,
};
