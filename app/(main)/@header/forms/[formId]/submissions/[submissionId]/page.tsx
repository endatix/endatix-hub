import { SubmissionDetailsProvider } from "@/features/submissions/ui/details/submission-details-context";
import { SubmissionDetailsHeader } from "@/features/submissions/ui/details/submission-details-header";
import { getSubmissionDetailsUseCase } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Suspense } from "react";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
  }>;
};

export default async function SubmissionPageHeader({ params }: Params) {
  const { formId, submissionId } = await params;

  const submissionPromise = getSubmissionDetailsUseCase({
    formId,
    submissionId,
  });

  return (
    <Suspense fallback={<div className="h-16 w-full" />}>
      <SubmissionDetailsProvider submissionPromise={submissionPromise}>
        <SubmissionDetailsHeader formId={formId} submissionId={submissionId} />
      </SubmissionDetailsProvider>
    </Suspense>
  );
}
