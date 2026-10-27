import { AudienceDataType } from "@/lib/endatix-api/audience/types";

/** A data type for a new property, suggested from a column's values, with the evidence for it. */
export type TypeSuggestion = {
  dataType: AudienceDataType;
  /** The column's first distinct values, shown beside the suggestion. */
  values: string[];
  /** Why this type: what every value has in common, or how many distinct values there are. */
  reason: string;
  /** The distinct values as single-choice keys, or `null` when they cannot be one. */
  choices: string[] | null;
};

const EVIDENCE_VALUES = 3;

/** Few enough distinct values to suggest a single choice. */
const MAX_SUGGESTED_CHOICES = 10;

/** The most distinct values the scripter may still turn into single-choice keys. */
const MAX_CHOICES = 50;

/** SurveyJS splits a choice written as `value|text`, so the API refuses a key holding it. */
const CHOICE_VALUE_SEPARATOR = "|";

// OSS `PropertyValueRules`: a number is a sign, digits, a decimal point and an exponent, nothing
// else; a date is `yyyy-MM-dd`; a date-time is `yyyy-MM-ddTHH:mm`, with seconds and a fraction of up
// to seven digits, and an optional offset.
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,7})?)?(?:Z|[+-](\d{2}):(\d{2}))?$/;

/** A zero before another digit (`00123`): a code such as a postcode or an ID, not a quantity. */
const LEADING_ZERO = /^[+-]?0\d/;

const isNumber = (value: string) =>
  NUMBER.test(value) &&
  !LEADING_ZERO.test(value) &&
  Number.isFinite(Number(value));

function isDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isDateTime(value: string): boolean {
  const match = DATE_TIME.exec(value);
  if (!match) return false;
  const [
    date,
    hours,
    minutes,
    seconds = "0",
    offsetHours = "0",
    offsetMinutes = "0",
  ] = match.slice(1);
  return (
    isDate(date) &&
    Number(hours) < 24 &&
    Number(minutes) < 60 &&
    Number(seconds) < 60 &&
    Number(offsetHours) < 24 &&
    Number(offsetMinutes) < 60
  );
}

const isBoolean = (value: string) => value === "true" || value === "false";

/** The types every value of a column can prove, tried in this order. */
const PROVEN_TYPES: ReadonlyArray<{
  dataType: AudienceDataType;
  fits: (value: string) => boolean;
  reason: string;
}> = [
  { dataType: AudienceDataType.Number, fits: isNumber, reason: "All numbers" },
  {
    dataType: AudienceDataType.Date,
    fits: isDate,
    reason: "All dates (YYYY-MM-DD)",
  },
  {
    dataType: AudienceDataType.DateTime,
    fits: isDateTime,
    reason: "All ISO dates and times",
  },
  {
    dataType: AudienceDataType.Boolean,
    fits: isBoolean,
    reason: "All true or false",
  },
];

function choiceKeys(distinct: string[]): string[] | null {
  if (distinct.length > MAX_CHOICES) return null;
  const valid = distinct.every((key) => !key.includes(CHOICE_VALUE_SEPARATOR));
  return valid ? distinct : null;
}

function choiceOrText(_filled: string[], distinct: string[]) {
  const choices = choiceKeys(distinct);
  const few = distinct.length <= MAX_SUGGESTED_CHOICES;
  return {
    dataType:
      choices && few
        ? AudienceDataType.SingleChoice
        : AudienceDataType.Text,
    reason: `${distinct.length.toLocaleString()} distinct values`,
    choices,
  };
}

function provenOrDistinct(filled: string[], distinct: string[]) {
  const proven = PROVEN_TYPES.find((type) =>
    filled.every((value) => type.fits(value)),
  );
  if (proven) {
    const { dataType, reason } = proven;
    return { dataType, reason, choices: choiceKeys(distinct) };
  }
  return choiceOrText(filled, distinct);
}

/**
 * The data type a column's values suggest, read from every row of the file: the first of number,
 * date, date and time, and boolean that every value fits; else single choice when a few values
 * else text. Deterministic, and a date whose day and month could swap (`11/04/25`) is text.
 */
export function suggestDataType(values: readonly string[]): TypeSuggestion {
  const filled = values.map((value) => value.trim()).filter(Boolean);
  if (filled.length === 0) {
    return {
      dataType: AudienceDataType.Text,
      values: [],
      reason: "No values in the file",
      choices: null,
    };
  }
  const distinct = [...new Set(filled)];
  return {
    ...provenOrDistinct(filled, distinct),
    values: distinct.slice(0, EVIDENCE_VALUES),
  };
}
