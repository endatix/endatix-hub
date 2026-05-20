"use client";

import { Submission } from "@/lib/endatix-api";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import { ViewSubmissionCore } from "./view-submission-core";

export interface PublicViewSubmissionProps {
  submission: Submission;
}

/**
 * Public token-based submission view — requires {@link FormRuntimeProvider} on the page.
 */
export function PublicViewSubmission({
  submission,
}: Readonly<PublicViewSubmissionProps>) {
  const formRuntime = useFormRuntime();

  const customQuestions = submission.formDefinition?.customQuestions;

  return (
    <ViewSubmissionCore
      submission={submission}
      customQuestions={customQuestions}
      getRuntimeState={() => formRuntime.stateRef.current}
    />
  );
}
