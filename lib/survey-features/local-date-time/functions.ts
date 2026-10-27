import { LOCAL_DATE_TIME_FUNCTION } from "./constants";

/**
 * `datetime-local` accepts `YYYY-MM-DDTHH:mm` only. A stored value carries an offset;
 * the minutes before that offset are the wall-clock time, not the respondent's zone.
 */
const OFFSET_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/i;

export function edxLocalDateTime(params: unknown[]): unknown {
  const value = Array.isArray(params) ? params[0] : params;
  if (typeof value !== "string") return value;
  return OFFSET_DATE_TIME.exec(value)?.[1] ?? value;
}

export { LOCAL_DATE_TIME_FUNCTION };
