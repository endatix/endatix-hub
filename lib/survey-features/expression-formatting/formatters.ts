import {
  formatCurrency,
  formatDecimalNumber,
  formatDateTime,
  parseNumberValue,
  type DateStyle,
} from "@/lib/utils/formatters";
import type { FormattingFunc } from "./types";

/**
 * Formats a number as currency.
 * @param params - The parameters for the function.
 *  [0] - The number to format. 
 *  [1] - The currency code to format to. 
 *  [2] - The locale to format to.
 * @returns The formatted currency
 */
function formatCurrencyExpressionFunc(params: unknown[]): string {
  if (!params || params.length < 1) return "";

  const value = parseNumberValue(params[0]);
  if (value === null) return String(params[0]);

  const currencyCode =
    params.length > 1 && params[1] ? String(params[1]) : "USD";
  const locale = params.length > 2 && params[2] ? String(params[2]) : undefined;

  return formatCurrency(value, currencyCode, locale);
}

/**
 * Formats a number with specified decimal places.
 * @param params - The parameters for the function.
 *  [0] - The number to format. 
 *  [1] - The number of decimal places to format to. 
 *  [2] - The locale to format to.
 *  The third parameter is the locale to format to.
 * @returns The formatted number
 */
function formatNumberExpressionFunc(params: unknown[]): string {
  if (!params || params.length < 1) return "";

  const value = parseNumberValue(params[0]);
  if (value === null) return String(params[0]);

  const decimalPlaces =
    params.length > 1 && params[1] !== undefined ? Number(params[1]) : 2;
  const locale = params.length > 2 && params[2] ? String(params[2]) : undefined;

  return formatDecimalNumber(value, decimalPlaces, locale);
}

/**
 * Formats a date value.
 * @param params - The parameters for the function.
 *  [0] - The date to format. 
 *  [1] - The style to format to. Can be "full", "long", "medium", or "short".
 *  [2] - The locale to format to.
 * @returns The formatted date
 */
function formatDateExpressionFunc(params: unknown[]): string {
  if (!params || params.length < 1) return "";

  const styleStr = params.length > 1 && params[1] ? String(params[1]) : "short";
  const locale = params.length > 2 && params[2] ? String(params[2]) : undefined;

  const dateStyle: DateStyle = ["full", "long", "medium", "short"].includes(
    styleStr,
  )
    ? (styleStr as DateStyle)
    : "short";

  return formatDateTime(params[0], dateStyle, locale);
}

/**
 * Formats a value based on the format type.
 * @param params - The parameters for the function.
 *  [0] - The value to format.
 *  [1] - The format type. Can be "currency", "percent", "date", or "number".
 *  [2] - The currency code to format to.
 *  [3] - The locale to format to.
 */
function smartFormatExpressionFunc(params: unknown[]): string {
  if (!params || params.length < 2) {
    return params?.[0] !== undefined ? String(params[0]) : "";
  }

  const value = params[0];
  const formatType = String(params[1]).toLowerCase();

  switch (formatType) {
    case "currency": {
      const currency = params.length > 2 ? String(params[2]) : "USD";
      const locale = params.length > 3 ? String(params[3]) : undefined;
      return formatCurrencyExpressionFunc([value, currency, locale]);
    }
    case "percent": {
      const num = parseNumberValue(value);
      if (num === null) return String(value);
      return new Intl.NumberFormat(undefined, { style: "percent" }).format(num);
    }
    case "date": {
      const style = params.length > 2 ? String(params[2]) : "medium";
      return formatDateExpressionFunc([value, style]);
    }
    case "number": {
      const decimals =
        params.length > 2 && params[2] !== undefined ? Number(params[2]) : 2;
      const locale = params.length > 3 ? String(params[3]) : undefined;
      return formatNumberExpressionFunc([value, decimals, locale]);
    }
    default:
      return String(value);
  }
}

const formattingFunctions = Object.freeze([
  Object.freeze({ name: "formatCurrency", func: formatCurrencyExpressionFunc }),
  Object.freeze({ name: "formatNumber", func: formatNumberExpressionFunc }),
  Object.freeze({ name: "formatDate", func: formatDateExpressionFunc }),
  Object.freeze({ name: "format", func: smartFormatExpressionFunc }),
] as const satisfies readonly FormattingFunc[]);

const expressionFormattingRegistry = Object.freeze(
  formattingFunctions.map((entry) => Object.freeze(entry)),
);

export {
  expressionFormattingRegistry,
  formatCurrencyExpressionFunc as formatCurrency
};
