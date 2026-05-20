"use client";

import "../shared/load-submission-question-registry";
import { Submission } from "@/lib/endatix-api";
import type { ExtensionRuntimeState } from "@/lib/survey-extensions/types";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import ViewSubmissionHeader from "./view-submission-header";

const SubmissionSurvey = dynamic(() => import("../shared/submission-survey"), {
  ssr: false,
});

export interface ViewSubmissionCoreProps {
  submission: Submission;
  customQuestions?: string[];
  getRuntimeState: () => ExtensionRuntimeState;
}

export function ViewSubmissionCore({
  submission,
  customQuestions,
  getRuntimeState,
}: Readonly<ViewSubmissionCoreProps>) {
  const { isReady, onModelCreated } = useSurveyExtensions({
    formJson: submission.formDefinition?.jsonData,
    runtimeDeps: {
      getRuntimeState,
    },
  });

  if (!isReady) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <ViewSubmissionHeader submission={submission} />
      <SubmissionSurvey
        submission={submission}
        customQuestions={customQuestions}
        readOnly={true}
        onModelCreated={onModelCreated}
      />
      <div className="flex h-8 flex-row items-center justify-center gap-2 text-muted-foreground">
        <Info className="h-4 w-4" />
        End of submission
      </div>
    </div>
  );
}
