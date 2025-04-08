"use server";

import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Result } from "@/lib/result";
import { BackToSubmissionsButton } from "./back-to-submissions-button";
import { SubmissionAnswers } from "./submission-answers";
import { SubmissionHeader } from "./submission-header";
import { SubmissionProperties } from "./submission-properties";

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
      <SubmissionAnswers
        formDefinition={submission.formDefinition.jsonData}
        submissionData={submission.jsonData}
        formId={formId}
      />
    </>
  );
}

export default SubmissionDetails;
