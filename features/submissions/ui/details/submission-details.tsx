"use server";

import { NotFoundComponent } from "@/components/error-handling/not-found";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { viewerCanOpenParticipantUseCase } from "@/features/submissions/use-cases/viewer-can-open-participant.use-case";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import { Result } from "@/lib/result";
import { CustomQuestion } from "@/services/api";
import { BackToSubmissionsButton } from "./back-to-submissions-button";
import { MetadataCard } from "./metadata-card";
import { SubmissionDetailsContent } from "./submission-details-content";
import { SubmissionDetailsProvider } from "./submission-details-context";

interface SubmissionDetailsProps {
  formId: string;
  submissionId: string;
}

async function SubmissionDetails({
  formId,
  submissionId,
}: Readonly<SubmissionDetailsProps>) {
  let customQuestions: CustomQuestion[] = [];
  const submissionPromise = getSubmissionDetailsUseCase({
    formId,
    submissionId,
  });

  const [submissionResult, customQuestionsResult, canOpenParticipant] =
    await Promise.all([
      getSubmissionDetailsUseCase({ formId, submissionId }),
      getCustomQuestionsAction(),
      viewerCanOpenParticipantUseCase(),
    ]);

  if (Result.isSuccess(customQuestionsResult)) {
    customQuestions = customQuestionsResult.value;
  }

  if (Result.isError(submissionResult)) {
    return <SubmissionNotFound formId={formId} />;
  }
  const submission = submissionResult.value;
  if (!submission?.formDefinition) {
    return <div>Form definition not found</div>;
  }

  return (
    <SubmissionDetailsProvider submissionPromise={submissionPromise}>
      <DesignerRuntimeProvider
        initialState={{
          formId,
          submissionId,
        }}
      >
        <AssetStorageProvider>
          <div className="flex w-full flex-col gap-6">
            <MetadataCard />
            <SubmissionDetailsContent
              canOpenParticipant={canOpenParticipant}
              customQuestions={customQuestions}
            />
          </div>
        </AssetStorageProvider>
      </DesignerRuntimeProvider>
    </SubmissionDetailsProvider>
  );
}

function SubmissionNotFound({ formId }: Readonly<{ formId: string }>) {
  return (
    <NotFoundComponent
      notFoundTitle="Submission not found"
      notFoundSubtitle="We couldn't find that submission."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    >
      <BackToSubmissionsButton
        formId={formId}
        text="All form submissions"
        variant="default"
      />
    </NotFoundComponent>
  );
}

export default SubmissionDetails;
