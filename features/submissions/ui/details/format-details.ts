import { parseDate } from "@/lib/utils";

export const DASH_NO_DATA = "—";

/** A Submission Details date and time, e.g. "Oct 19, 2026, 12:00 PM"; a dash when missing or invalid. */
export function formatDetailsDate(date?: Date): string {
  const parsedDate = date ? parseDate(date) : null;
  if (!parsedDate) {
    return DASH_NO_DATA;
  }

  return parsedDate.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour12: true,
  });
}

/** A value as text, trimmed; a dash when it is missing or blank. */
export function formatOptionalValue(value?: string | number | null): string {
  const text =
    value === undefined || value === null ? "" : String(value).trim();
  return text.length > 0 ? text : DASH_NO_DATA;
}
