import { useEffect, useRef } from "react";

import type { SubmissionOperation } from "../submit-form-operation";
import { submissionQueue } from "./submission-queue";

export type RecordOpen = {
  formId: string;
  urlToken: string | undefined;
  isFinished: boolean;
  onOpened: (opened: SubmissionOperation) => void;
};

/**
 * Records the respondent's open once per page view, ahead of any save, so the submission's time
 * starts when the form shows. The API decides a test submission as it does for a save. A finished
 * submission records nothing.
 */
export function useRecordOpen({
  formId,
  urlToken,
  isFinished,
  onOpened,
}: RecordOpen): void {
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current || isFinished) {
      return;
    }

    recordedRef.current = true;
    submissionQueue.enqueueOpen({ formId, urlToken, onOpened });
  }, [formId, urlToken, isFinished, onOpened]);
}
