import { clampExpiryMinutes } from "@/lib/share-links/share-link-expiry";

/** The test links route's ranges (endatix#1428): runs 1–10, 1 hour to 60 days, 500 per call. */
export const MAX_RUNS = 10;
export const MAX_TEST_LINKS = 500;
const MIN_EXPIRY_MINUTES = 60;

/** Within 1 hour to 60 days; anything else is the 7-day default or the nearest bound. */
export const testLinkExpiry = (minutes: number) =>
  Math.max(MIN_EXPIRY_MINUTES, clampExpiryMinutes(minutes));

/** Within 1 to 10 runs; anything else is 1. */
export const clampRuns = (runs: number) =>
  Number.isFinite(runs) ? Math.min(MAX_RUNS, Math.max(1, Math.floor(runs))) : 1;
