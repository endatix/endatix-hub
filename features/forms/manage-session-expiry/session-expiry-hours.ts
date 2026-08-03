/** Hours until session tokens expire. `null` means never expire. */
export type SessionExpiryHours = number | null;

export function formatSessionExpiryHours(hours: SessionExpiryHours): string {
  if (hours == null) {
    return "Never expires";
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function formatOrganizationDefaultLabel(
  hours: SessionExpiryHours,
): string {
  return `Organization default (${formatSessionExpiryHours(hours)})`;
}

/**
 * Parses a hours input. Empty string means "clear / inherit / never" depending on context.
 * Returns `{ ok: false }` for invalid non-empty values.
 */
export function parseSessionExpiryHoursInput(
  raw: string,
): { ok: true; hours: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, hours: null };
  }

  // Decimal digits only — reject hex/scientific/`Number` coercions like "0x10" / "1e2".
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      message: "Session expiry must be a positive whole number of hours.",
    };
  }

  const hours = Number(trimmed);
  if (hours <= 0) {
    return {
      ok: false,
      message: "Session expiry must be a positive whole number of hours.",
    };
  }

  return { ok: true, hours };
}

export function sessionExpiryHoursToInput(
  hours: number | null | undefined,
): string {
  return hours != null ? String(hours) : "";
}
