/**
 * Calendar date range for column filters. `from` / `to` are **UTC calendar** dates
 * in `YYYY-MM-DD` form. Consumers should not pass time-of-day or non-ISO strings.
 */
export type DateFilterValue = {
  /** Inclusive start day, `YYYY-MM-DD` (UTC calendar). */
  from?: string;
  /** Inclusive end day, `YYYY-MM-DD` (UTC calendar). */
  to?: string;
};
