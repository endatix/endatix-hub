import { useCallback } from "react";
import { submissionQueue } from "./submission-queue";
import { SubmissionData } from "@/features/submissions/types";

export function useSubmissionQueue(formId: string, urlToken?: string) {
  const enqueueSubmission = useCallback(
    (data: SubmissionData) => {
      submissionQueue.enqueue({ formId, data, urlToken });
    },
    [formId, urlToken],
  );

  const clearQueue = useCallback(() => {
    submissionQueue.clear();
  }, []);

  return {
    enqueueSubmission,
    clearQueue,
  };
}
