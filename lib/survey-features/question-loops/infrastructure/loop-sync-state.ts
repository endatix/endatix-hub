import { SurveyModel } from "survey-core";

/**
 * Per-survey re-entrancy guard for loop syncing.
 *
 * Assigning a loop's `value` fires `onValueChanged`, which would re-enter the
 * sync that just ran. The guard swallows that echo — but it has to be scoped to
 * one survey, because a module-level flag is shared by every survey on the page
 * and lets one model's sync silence another's.
 *
 * The cascade into nested loops runs **inside** the guarded region as direct
 * calls, never by re-entering through events, so it is not swallowed.
 */
const surveysSyncing = new WeakSet<SurveyModel>();

/** True while a loop sync is in progress for this survey. */
export function isLoopSyncInProgress(survey: SurveyModel): boolean {
  return !!survey && surveysSyncing.has(survey);
}

/**
 * Runs `work` with this survey's sync guard held. Re-entrant calls are dropped
 * rather than queued: whatever triggered them is a consequence of the work
 * already running.
 */
export function runLoopSyncExclusively(
  survey: SurveyModel,
  work: () => void,
): void {
  if (!survey || surveysSyncing.has(survey)) {
    return;
  }

  surveysSyncing.add(survey);
  try {
    work();
  } finally {
    surveysSyncing.delete(survey);
  }
}
