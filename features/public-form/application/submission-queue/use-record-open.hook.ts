import { useEffect, useRef } from "react";

import type { SubmissionOperation } from "../submit-form-operation";
import { submissionQueue } from "./submission-queue";

export type RecordOpen = {
  formId: string;
  urlToken: string | undefined;
  /** The survey shows: its model loaded without error. */
  isReady: boolean;
  onOpened: (opened: SubmissionOperation) => void;
};

/**
 * Records the respondent's open once per page view, when the survey shows and before any save, so
 * the submission's time starts there. The API marks a test submission on create, as it does for a
 * first save. A completed or closed submission never mounts the survey, so it records nothing.
 */
export function useRecordOpen({
  formId,
  urlToken,
  isReady,
  onOpened,
}: RecordOpen): void {
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current || !isReady) {
      return;
    }

    recordedRef.current = true;
    submissionQueue.enqueueOpen({ formId, urlToken, onOpened });
  }, [formId, urlToken, isReady, onOpened]);
}
