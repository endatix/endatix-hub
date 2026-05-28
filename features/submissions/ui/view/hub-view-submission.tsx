"use client";

import { Submission } from "@/lib/endatix-api";
import { useDesignerRuntime } from "@/lib/designer-runtime";
import { ViewSubmissionCore } from "./view-submission-core";

export interface HubViewSubmissionProps {
  submission: Submission;
}

/**
 * Hub read-only full survey view — requires {@link DesignerRuntimeProvider} on the page.
 * Use on hub routes that render the full SurveyJS model (not submission-details Q&A list).
 */
export function HubViewSubmission({
  submission,
}: Readonly<HubViewSubmissionProps>) {
  const designerRuntime = useDesignerRuntime();

  return (
    <ViewSubmissionCore
      submission={submission}
      getRuntimeState={() => designerRuntime.stateRef.current}
    />
  );
}
