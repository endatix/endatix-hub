import { formatDetailsDateTime } from "@/lib/date-utils";

export const DASH_NO_DATA = "—";

/** A Submission Details date and time, e.g. "Oct 19, 2026, 12:00 PM"; a dash when missing or invalid. */
export function formatDetailsDate(date?: Date): string {
  return formatDetailsDateTime(date, DASH_NO_DATA);
}

/** A value as text, trimmed; a dash when it is missing or blank. */
export function formatOptionalValue(value?: string | number | null): string {
  const text =
    value === undefined || value === null ? "" : String(value).trim();
  return text.length > 0 ? text : DASH_NO_DATA;
}
