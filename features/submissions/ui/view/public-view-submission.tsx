"use client";

import type { Submission } from "@/lib/endatix-api";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import { useCallback } from "react";
import type { Model } from "survey-core";
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
  const configureSurveyModel = useCallback((model: Model) => {
    model.widthMode = "responsive";
  }, []);

  return (
    <main className="min-h-screen w-full bg-content-canvas px-4 py-6 sm:px-6 lg:px-8">
      <ViewSubmissionCore
        submission={submission}
        customQuestions={customQuestions}
        configureSurveyModel={configureSurveyModel}
        getRuntimeState={() => formRuntime.stateRef.current}
      />
    </main>
  );
}
