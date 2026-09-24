"use client";

import { DEFAULT_CATALOG_LOCALE } from "@/lib/localization";

export type SubmissionDisplayLocaleSnapshot = {
  /** Empty until the details page has loaded the survey. */
  catalogLocales: string[];
  displayCatalogLocale: string;
};

const EMPTY_SNAPSHOT: SubmissionDisplayLocaleSnapshot = {
  catalogLocales: [],
  displayCatalogLocale: DEFAULT_CATALOG_LOCALE,
};

const bySubmissionId = new Map<string, SubmissionDisplayLocaleSnapshot>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Bridge from the details page to the `@header` slot, which do not share React
 * context. Export PDF and the PDF share link read the label locale from here.
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
  snapshot: SubmissionDisplayLocaleSnapshot,
) {
  bySubmissionId.set(submissionId, snapshot);
  notify();
}

export function clearSubmissionDisplayLocale(submissionId: string) {
  if (bySubmissionId.delete(submissionId)) {
    notify();
  }
}
