"use client";

import { customQuestions } from "@/customizations/questions/question-registry";
import { Submission } from "@/lib/endatix-api";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { ActiveDefinition } from "@/types";
import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import ViewSubmissionHeader from "./view-submission-header";

const SubmissionSurvey = dynamic(
  () => import("../shared/submission-survey"),
  {
    ssr: false,
  },
);

// Load all custom questions registered in the question registry
for (const questionName of customQuestions) {
  try {
    await questionLoaderModule.loadQuestion(questionName);
    console.debug(`✅ Loaded custom question: ${questionName}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load custom question: ${questionName}`, error);
  }
}

interface ViewSubmissionProps {
  submission: Submission;
}

function ViewSubmission({ submission }: ViewSubmissionProps) {
  const customQuestionsList = useMemo(() => {
    return (submission.formDefinition as ActiveDefinition)?.customQuestions;
  }, [submission.formDefinition]);

  return (
    <div className="flex flex-col gap-4">
      <ViewSubmissionHeader submission={submission} />
      <SubmissionSurvey
        submission={submission}
        customQuestions={customQuestionsList}
        readOnly={true}
      />
      <div className="h-8 text-muted-foreground flex flex-row justify-center items-center gap-2">
        <Info className="h-4 w-4" />
        End of submission
      </div>
    </div>
  );
}

export default ViewSubmission;
