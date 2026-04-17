import { FunctionFactory } from "survey-core";
import { expressionFormattingRegistry } from "./formatters";

let areFunctionsRegistered = false;
const IS_ASYNC = false;
const USE_CACHE = false;

export function registerExpressionFormatting(): void {
  if (areFunctionsRegistered) return;

  const factory = FunctionFactory.Instance;
  for (const { name, func } of expressionFormattingRegistry) {
    factory.register(name, func, IS_ASYNC, USE_CACHE);
  }

  areFunctionsRegistered = true;
}

registerExpressionFormatting();
