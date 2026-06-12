"use client";

import "../shared/load-submission-question-registry";
import { Submission } from "@/lib/endatix-api";
import type { ExtensionRuntimeState } from "@/lib/survey-extensions/types";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { Model } from "survey-core";
import ViewSubmissionHeader from "./view-submission-header";

const SubmissionSurvey = dynamic(() => import("../shared/submission-survey"), {
  ssr: false,
});

export interface ViewSubmissionCoreProps {
  submission: Submission;
  customQuestions?: string[];
  configureSurveyModel?: (model: Model) => void;
  getRuntimeState: () => ExtensionRuntimeState;
}

export function ViewSubmissionCore({
  submission,
  customQuestions,
  configureSurveyModel,
  getRuntimeState,
}: Readonly<ViewSubmissionCoreProps>) {
  const { isReady, onModelCreated } = useSurveyExtensions({
    formJson: submission.formDefinition?.jsonData,
    runtimeDeps: {
      getRuntimeState,
    },
  });
  const handleModelCreated = useCallback(
    (model: Model) => {
      configureSurveyModel?.(model);
      onModelCreated(model);
    },
    [configureSurveyModel, onModelCreated],
  );

  if (!isReady) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <ViewSubmissionHeader submission={submission} />
      <SubmissionSurvey
        submission={submission}
        customQuestions={customQuestions}
        readOnly={true}
        onModelCreated={handleModelCreated}
      />
      <div className="flex h-8 flex-row items-center justify-center gap-2 text-muted-foreground">
        <Info className="h-4 w-4" />
        End of submission
      </div>
    </div>
  );
}
