/**
 * Maintenance mode page data — env-backed with safe defaults (server-only usage).
 */

export type MaintenancePageData = {
  title: string;
  cardDescription: string;
  body: string;
  footer: string;
  metadataTitle: string;
  metadataDescription: string;
};

/**
 * `MAINTENANCE_BADGE_LABEL` is deprecated and no longer read: the maintenance page is
 * a public status page (DESIGN.md §6), which has no badge slot.
 */
const DEFAULT_COPY: MaintenancePageData = {
  title: "We'll be right back",
  cardDescription: "This application is temporarily unavailable.",
  body: "We're performing scheduled maintenance. Please check back soon. We apologize for the inconvenience.",
  footer: "Thank you for your patience.",
  metadataTitle: "Scheduled maintenance",
  metadataDescription:
    "The application is temporarily unavailable while we perform maintenance.",
};

function envOrDefault(key: string, fallback: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return fallback;
  }
  return value;
}

/** Reads env each call so tests can stub `MAINTENANCE_MODE` without reloading modules. */
export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === "true";
}

/**
 * Optional non-negative integer for `Retry-After` (seconds). Invalid or unset → undefined.
 */
export function getMaintenanceRetryAfterSeconds(): number | undefined {
  const raw = process.env.MAINTENANCE_RETRY_AFTER_SECONDS;
  if (raw === undefined || raw === "") {
    return undefined;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}

export function getMaintenanceData(): MaintenancePageData {
  return {
    title: envOrDefault("MAINTENANCE_TITLE", DEFAULT_COPY.title),
    cardDescription: envOrDefault(
      "MAINTENANCE_CARD_DESCRIPTION",
      DEFAULT_COPY.cardDescription,
    ),
    body: envOrDefault("MAINTENANCE_BODY", DEFAULT_COPY.body),
    footer: envOrDefault("MAINTENANCE_FOOTER", DEFAULT_COPY.footer),
    metadataTitle: envOrDefault(
      "MAINTENANCE_METADATA_TITLE",
      DEFAULT_COPY.metadataTitle,
    ),
    metadataDescription: envOrDefault(
      "MAINTENANCE_METADATA_DESCRIPTION",
      DEFAULT_COPY.metadataDescription,
    ),
  };
}
