"use server";

import { NotFoundComponent } from "@/components/error-handling/not-found";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import {
  canAccessAudience,
  PARTICIPANT_PAGE_PERMISSION,
} from "@/features/audience/server";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import type { Submission } from "@/lib/endatix-api";
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

  const [submissionResult, customQuestionsResult] = await Promise.all([
    getSubmissionDetailsUseCase({ formId, submissionId }),
    getCustomQuestionsAction(),
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
  const canOpenParticipant = await viewerCanOpenParticipant(submission);

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

/** Asks only when the Snapshot names a participant: most submissions have none to open. */
async function viewerCanOpenParticipant(
  submission: Submission,
): Promise<boolean> {
  if (!submission.personalization?.memberId) return false;
  return canAccessAudience(PARTICIPANT_PAGE_PERMISSION);
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
