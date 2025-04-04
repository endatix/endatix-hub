"use server";

import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { SubmissionProperties } from "./submission-properties";
import { BackToSubmissionsButton } from "./back-to-submissions-button";
import { SubmissionHeader } from "./submission-header";
import { SubmissionAnswers } from "./submission-answers";
import { SectionTitle } from "@/components/headings/section-title";

async function SubmissionDetails({
  formId,
  submissionId,
}: {
  formId: string;
  submissionId: string;
}) {
  const submissionResult = await getSubmissionDetailsUseCase({
    formId,
    submissionId,
  });

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

  return (
    <>
      <SubmissionHeader
        formId={formId}
        submissionId={submissionId}
        status={submission.status}
      />
      <SubmissionProperties submission={submission} />
      <SectionTitle title="Submission Answers" headingClassName="py-2 my-0" />
      <SubmissionAnswers
        formDefinition={submission.formDefinition.jsonData}
        submissionData={submission.jsonData}
      />
    </>
  );
}

export default SubmissionDetails;
