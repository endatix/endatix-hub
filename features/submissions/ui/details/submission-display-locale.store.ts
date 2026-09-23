"use client";

import { DEFAULT_CATALOG_LOCALE } from "@/lib/localization";

export type SubmissionDisplayLocaleSnapshot = {
  ready: boolean;
  catalogLocales: string[];
  displayCatalogLocale: string;
};

const EMPTY_SNAPSHOT: SubmissionDisplayLocaleSnapshot = {
  ready: false,
  catalogLocales: [],
  displayCatalogLocale: DEFAULT_CATALOG_LOCALE,
};

const bySubmissionId = new Map<string, SubmissionDisplayLocaleSnapshot>();
const listeners = new Set<() => void>();

/**
 * Submission details page and the parallel header slot do not share React
 * context. This store is how Export PDF and share links see the label locale.
 */
export function subscribeSubmissionDisplayLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSubmissionDisplayLocale(
  submissionId: string,
): SubmissionDisplayLocaleSnapshot {
  return bySubmissionId.get(submissionId) ?? EMPTY_SNAPSHOT;
}

export function publishSubmissionDisplayLocale(
  submissionId: string,
  snapshot: Omit<SubmissionDisplayLocaleSnapshot, "ready">,
) {
  bySubmissionId.set(submissionId, { ready: true, ...snapshot });
  for (const listener of listeners) {
    listener();
  }
}
