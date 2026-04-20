import {
  formatCurrency,
  formatDecimalNumber,
  formatDateTime,
  parseNumberValue,
  type DateStyle,
  VALID_DATE_STYLES,
} from "@/lib/utils/formatters";
import { getNumberParam, getStringParam } from "./expression-utils";
import { FormattingFunc } from "./types";

const DEFAULT_DATE_STYLE: DateStyle = "short";
const EMPTY_STRING = "";
const DEFAULT_CURRENCY_CODE = "USD";
const DEFAULT_DECIMAL_PLACES = 2;

/**
 * Formats a number as currency.
 * @param params - The parameters for the function.
 *  [0] - The number to format.
 *  [1] - The currency code to format to.
 *  [2] - The locale to format to.
 * @returns The formatted currency
 */
function formatCurrencyExpressionFunc(params: unknown[]): string {
  if (!params || params.length < 1) return EMPTY_STRING;

  const currencyValue = getNumberParam(params, 0);
  if (currencyValue === undefined) {
    return String(params[0]);
  }

  const currencyCode = getStringParam(params, 1) || DEFAULT_CURRENCY_CODE;
  const locale = getStringParam(params, 2);

  return formatCurrency(currencyValue, currencyCode, locale);
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
  if (!params || params.length < 1) return EMPTY_STRING;

  const numberValue = getNumberParam(params, 0);
  if (numberValue === undefined) {
    return String(params[0]);
  }

  const decimalPlaces = getNumberParam(params, 1) ?? DEFAULT_DECIMAL_PLACES;
  const locale = getStringParam(params, 2);

  return formatDecimalNumber(numberValue, decimalPlaces, locale);
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
  if (!params || params.length < 1) return EMPTY_STRING;

  const dateStyleValue = getStringParam(params, 1);
  const locale = getStringParam(params, 2);

  const normalizedDateStyle = dateStyleValue
    ? dateStyleValue.toLowerCase()
    : DEFAULT_DATE_STYLE;

  const dateStyle: DateStyle = VALID_DATE_STYLES.includes(
    normalizedDateStyle as DateStyle,
  )
    ? (normalizedDateStyle as DateStyle)
    : DEFAULT_DATE_STYLE;

  return formatDateTime(params[0], dateStyle, locale);
}

/**
 * Formats a value based on the format type.
 * @param params - The parameters for the function.
 *  [0] - The value to format.
 *  [1] - The format type. Can be "currency", "percent", "date", or "number".
 *  [2] - First additional parameter for the format type.
 *  [3] - Second additional parameter for the format type, usually the locale.
 * @returns The formatted value
 */
function smartFormatExpressionFunc(params: unknown[]): string {
  if (!params) return EMPTY_STRING;

  const numOfParams = params.length;
  if (numOfParams < 2) {
    return numOfParams === 1 ? String(params[0]) : EMPTY_STRING;
  }

  const valueParam = params[0];
  const formatTypeParam = getStringParam(params, 1)?.toLowerCase();

  switch (formatTypeParam) {
    case "currency": {
      const currency = getStringParam(params, 2) ?? DEFAULT_CURRENCY_CODE;
      const locale = getStringParam(params, 3);
      return formatCurrencyExpressionFunc([valueParam, currency, locale]);
    }
    case "percent": {
      const num = parseNumberValue(valueParam);
      if (num === null) {
        return String(valueParam);
      }
      return new Intl.NumberFormat(undefined, { style: "percent" }).format(num);
    }
    case "date": {
      const dateStyle = getStringParam(params, 2) ?? DEFAULT_DATE_STYLE;
      const locale = getStringParam(params, 3);
      return formatDateExpressionFunc([valueParam, dateStyle, locale]);
    }
    case "number": {
      const decimals = getNumberParam(params, 2) ?? DEFAULT_DECIMAL_PLACES;
      const locale = getStringParam(params, 3);
      return formatNumberExpressionFunc([valueParam, decimals, locale]);
    }
    default:
      return String(valueParam);
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
  formatCurrencyExpressionFunc as formatCurrency,
  formatNumberExpressionFunc as formatNumber,
  formatDateExpressionFunc as formatDate,
  smartFormatExpressionFunc as smartFormat,
};
