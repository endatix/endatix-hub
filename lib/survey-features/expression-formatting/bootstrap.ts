import { FunctionFactory } from "survey-core";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  smartFormat,
} from "./formatters";

let areFunctionsRegistered = false;

export function registerExpressionFormatting(): void {
  if (areFunctionsRegistered) return;

  const factory = FunctionFactory.Instance;

  if (!factory.hasFunction("formatCurrency")) {
    factory.register("formatCurrency", formatCurrency);
  }
  if (!factory.hasFunction("formatNumber")) {
    factory.register("formatNumber", formatNumber);
  }
  if (!factory.hasFunction("formatDate")) {
    factory.register("formatDate", formatDate);
  }
  if (!factory.hasFunction("format")) {
    factory.register("format", smartFormat);
  }

  areFunctionsRegistered = true;
}

registerExpressionFormatting();
