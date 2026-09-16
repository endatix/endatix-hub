/**
 * How long a generated share link stays valid.
 *
 * The API validates this server-side: `CreateAccessTokenValidator` accepts 1 to
 * 86,400 minutes (60 days). Presets rather than a date picker - the cap is a
 * hard server rule, and presets avoid timezone handling and a validation
 * surface for a control with five sensible answers.
 */

/** Mirrors `CreateAccessTokenValidator.MaxExpiryMinutes` in the API. */
export const MAX_EXPIRY_MINUTES = 60 * 24 * 60;

export const DEFAULT_EXPIRY_MINUTES = 60 * 24 * 7;

export type ShareLinkExpiryOption = {
  value: number;
  label: string;
};

export const EXPIRY_OPTIONS: readonly ShareLinkExpiryOption[] = Object.freeze([
  { value: 60, label: "1 hour" },
  { value: 60 * 24, label: "24 hours" },
  { value: DEFAULT_EXPIRY_MINUTES, label: "7 days" },
  { value: 60 * 24 * 30, label: "30 days" },
  { value: MAX_EXPIRY_MINUTES, label: "60 days" },
]);

/**
 * Keeps a requested lifetime inside what the API will accept.
 *
 * Out-of-range values are corrected here rather than sent on to be rejected:
 * the failure would arrive as an opaque 400 well after the user chose.
 */
export function clampExpiryMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return DEFAULT_EXPIRY_MINUTES;
  }

  const whole = Math.floor(minutes);
  if (whole < 1) {
    return 1;
  }

  return Math.min(whole, MAX_EXPIRY_MINUTES);
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Relative lifetime for the row that was actually minted - never the currently
 * selected preset, which may have changed since.
 */
export function formatExpiresIn(
  expiresAt: string,
  now: Date = new Date(),
): string {
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) {
    return "Expiry unknown";
  }

  const remaining = expiry - now.getTime();
  if (remaining <= 0) {
    return "Expired";
  }

  if (remaining >= DAY_MS) {
    const days = Math.round(remaining / DAY_MS);
    return `Expires in ${days} ${days === 1 ? "day" : "days"}`;
  }

  if (remaining >= HOUR_MS) {
    const hours = Math.round(remaining / HOUR_MS);
    return `Expires in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  const minutes = Math.max(1, Math.round(remaining / MINUTE_MS));
  return `Expires in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
