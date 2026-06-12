import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { resolveSubmissionFormDefinition } from "@/features/public-submissions/resolve-submission-form-definition";
import { PublicViewSubmission } from "@/features/submissions/ui/view/view-submission";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import { Result } from "@/lib/result";
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

export default async function PublicViewSubmissionPage({
  params,
  searchParams,
}: Params) {
  const { formId } = await params;
  const { token } = await searchParams;

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    return (
      <NotFoundComponent
        notFoundTitle="Invalid Form"
        notFoundSubtitle="Invalid form ID provided"
        notFoundMessage="Please check the URL and try again."
        titleSize="medium"
      />
    );
  }

  if (!token) {
    return (
      <NotFoundComponent
        notFoundTitle="Token Required"
        notFoundSubtitle="No access token provided"
        notFoundMessage="You need a valid access token to view this submission."
        titleSize="medium"
      />
    );
  }

  if (!hasTokenPermission(token, TokenPermission.Read)) {
    return (
      <NotFoundComponent
        notFoundTitle="Access Denied"
        notFoundSubtitle="You don't have permission to view this submission"
        notFoundMessage="The access token does not include view permissions."
        titleSize="medium"
      />
    );
  }

  const submissionResult = await getSubmissionByAccessTokenUseCase({
    formId: validateFormIdResult.value,
    token,
  });

  if (Result.isError(submissionResult)) {
    const errorMessage = submissionResult.message.toLowerCase();

    if (errorMessage.includes("expired")) {
      return (
        <NotFoundComponent
          notFoundTitle="Token Expired"
          notFoundSubtitle="This link has expired"
          notFoundMessage="Please request a new access link to view this submission."
          titleSize="medium"
        />
      );
    }

    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("forbidden")
    ) {
      return (
        <NotFoundComponent
          notFoundTitle="Access Denied"
          notFoundSubtitle="You don't have permission to view this submission"
          notFoundMessage="The access token does not have view permissions."
          titleSize="medium"
        />
      );
    }

    return (
      <NotFoundComponent
        notFoundTitle="Submission Not Found"
        notFoundSubtitle="Unable to load submission"
        notFoundMessage="The submission may have been deleted or the token is invalid."
        titleSize="medium"
      />
    );
  }

  const submission = submissionResult.value;
  const definitionResult = resolveSubmissionFormDefinition(submission);

  if (Result.isError(definitionResult)) {
    console.error(definitionResult.message);
    return (
      <NotFoundComponent
        notFoundTitle="Form Not Found"
        notFoundSubtitle="Unable to load form definition"
        notFoundMessage="The form definition could not be loaded. Please try again later."
        titleSize="medium"
      />
    );
  }

  submission.formDefinition = definitionResult.value;

  return (
    <Suspense fallback={<SubmissionDataSkeleton />}>
      <AssetStorageProvider>
        <FormRuntimeProvider
          initialState={{
            formId: submission.formId,
            submissionId: submission.id,
            token,
            tokenType: "AccessToken",
          }}
        >
          <PublicViewSubmission submission={submission} />
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
