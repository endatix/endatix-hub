import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionLinkError } from "@/features/public-submissions/ui/submission-link-error";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { resolveSubmissionFormDefinition } from "@/features/public-submissions/resolve-submission-form-definition";
import { PublicEditSubmission } from "@/features/submissions/ui/edit/edit-submission";
import { Result } from "@/lib/result";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import { hasTokenPermission, TokenPermission } from "@/lib/utils";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Suspense } from "react";

type Params = {
  params: Promise<{
    formId: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function PublicEditSubmissionPage({
  params,
  searchParams,
}: Params) {
  const { formId } = await params;
  const { token } = await searchParams;

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    return <SubmissionLinkError action="edit" kind="invalidLink" />;
  }

  if (!token) {
    return <SubmissionLinkError action="edit" kind="tokenRequired" />;
  }

  if (!hasTokenPermission(token, TokenPermission.Write)) {
    return <SubmissionLinkError action="edit" kind="forbidden" />;
  }

  const submissionResult = await getSubmissionByAccessTokenUseCase({
    formId: validateFormIdResult.value,
    token,
  });

  if (Result.isError(submissionResult)) {
    const errorMessage = submissionResult.message.toLowerCase();

    if (errorMessage.includes("expired")) {
      return <SubmissionLinkError action="edit" kind="expired" />;
    }

    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("forbidden")
    ) {
      return <SubmissionLinkError action="edit" kind="forbidden" />;
    }

    return <SubmissionLinkError action="edit" kind="notFound" />;
  }

  const submission = submissionResult.value;
  const definitionResult = resolveSubmissionFormDefinition(submission);

  if (Result.isError(definitionResult)) {
    console.error(definitionResult.message);
    return <SubmissionLinkError action="edit" kind="formUnavailable" />;
  }

  submission.formDefinition = definitionResult.value;

  return (
    <Suspense fallback={<SubmissionDataSkeleton />}>
      <AssetStorageProvider>
        <FormRuntimeProvider
          initialState={{
            formId: validateFormIdResult.value,
            submissionId: submission.id,
            token,
            tokenType: "AccessToken",
          }}
        >
          <PublicEditSubmission
            submission={submission}
            formId={validateFormIdResult.value}
            token={token}
          />
        </FormRuntimeProvider>
      </AssetStorageProvider>
    </Suspense>
  );
}

function SubmissionDataSkeleton() {
  const questions = Array.from({ length: 10 }, (_, index) => index + 1);

  return (
    <div className="min-h-screen w-full overflow-auto bg-content-canvas p-4 sm:p-6 lg:p-8">
      <div className="flex w-full flex-col items-center space-y-4">
        <Skeleton className="h-12 w-full" />
        {questions.map((question) => (
          <Skeleton className="h-16 w-full" key={question} />
        ))}
      </div>
    </div>
  );
}
