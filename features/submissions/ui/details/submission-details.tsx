"use server";

import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { BackToSubmissionsButton } from "./back-to-submissions-button";
import { SubmissionAnswers } from "./submission-answers";
import { SubmissionHeader } from "./submission-header";
import { SubmissionProperties } from "./submission-properties";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { CustomQuestion } from "@/services/api";
import { SubmissionDetailsViewOptionsProvider } from "./submission-details-view-options-context";

async function SubmissionDetails({
  formId,
  submissionId,
}: {
  formId: string;
  submissionId: string;
}) {
  let customQuestions: CustomQuestion[] = [];
  const [submissionResult, customQuestionsResult] = await Promise.all([
    getSubmissionDetailsUseCase({
      formId,
      submissionId,
    }),
    getCustomQuestionsAction(),
  ]);

  if (Result.isSuccess(customQuestionsResult)) {
    customQuestions = customQuestionsResult.value;
  }

  if (Result.isError(submissionResult)) {
    return (
      <div>
        <h1>Submission not found</h1>
        <BackToSubmissionsButton
          formId={formId}
          text="All form submissions"
          variant="default"
        />
      </div>
    );
  }
  const submission = submissionResult.value;
  if (!submission?.formDefinition) {
    return <div>Form definition not found</div>;
  }

  const getLanguageDisplayName = (code?: string): string | undefined => {
    if (!code) return undefined;
    try {
      const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
      return displayNames.of(code) ?? code;
    } catch {
      return code;
    }
  };

  return (
    <SubmissionDetailsViewOptionsProvider>
      <SubmissionHeader
        formId={formId}
        submissionId={submissionId}
        status={submission.status}
        submissionLanguageName={getLanguageDisplayName((() => { try { const p = JSON.parse(submission.metadata ?? "{}"); return p?.language; } catch { return undefined; } })())}
      />
      <SubmissionProperties submission={submission} />
      <SubmissionAnswers
        formDefinition={submission.formDefinition.jsonData}
        submission={submission}
        formId={formId}
        customQuestions={customQuestions}
      />
    </SubmissionDetailsViewOptionsProvider>
  );
}

export default SubmissionDetails;
