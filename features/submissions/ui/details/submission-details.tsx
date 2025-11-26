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
import { getSubmissionLocale } from "../../submission-localization";
import { NotFoundComponent } from "@/components/error-handling/not-found";

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
      <NotFoundComponent
        notFoundTitle="Not found"
        notFoundSubtitle="The submission you are looking for does not exist."
        notFoundMessage="Please check the submission ID and try again."
        titleSize="medium"
      >
        <BackToSubmissionsButton
          formId={formId}
          text="All form submissions"
          variant="default"
        />
      </NotFoundComponent>
    );
  }
  const submission = submissionResult.value;
  if (!submission?.formDefinition) {
    return <div>Form definition not found</div>;
  }

  return (
    <SubmissionDetailsViewOptionsProvider>
      <SubmissionHeader
        formId={formId}
        submissionId={submissionId}
        status={submission.status}
        submissionLocale={getSubmissionLocale(submission)}
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
