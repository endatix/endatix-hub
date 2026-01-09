import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import EditSubmission from "@/features/submissions/ui/edit/edit-submission";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { getActiveFormDefinition } from "@/services/api";
import { Suspense } from "react";

function hasEditPermission(token: string): boolean {
  // Token format: {submissionId}.{expiryUnix}.{permissionsCode}.{signature}
  const parts = token.split(".");
  if (parts.length < 4) {
    return false;
  }
  const permissionsCode = parts[2];
  return permissionsCode.includes("w"); // w=write/edit
}

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
        notFoundMessage="You need a valid access token to edit this submission."
        titleSize="medium"
      />
    );
  }

  if (!hasEditPermission(token)) {
    return (
      <NotFoundComponent
        notFoundTitle="Access Denied"
        notFoundSubtitle="You don't have permission to edit this submission"
        notFoundMessage="The access token does not include edit permissions."
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
          notFoundMessage="Please request a new access link to edit this submission."
          titleSize="medium"
        />
      );
    }

    if (errorMessage.includes("permission") || errorMessage.includes("forbidden")) {
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

  try {
    const activeDefinition = await getActiveFormDefinition(
      submission.formId,
      true,
    );
    submission.formDefinition = activeDefinition;
  } catch (error) {
    console.error("Failed to fetch form definition", error);
    return (
      <NotFoundComponent
        notFoundTitle="Form Not Found"
        notFoundSubtitle="Unable to load form definition"
        notFoundMessage="The form definition could not be loaded. Please try again later."
        titleSize="medium"
      />
    );
  }

  return (
    <Suspense fallback={<SubmissionDataSkeleton />}>
      <EditSubmission
        submission={submission}
        formId={validateFormIdResult.value}
        token={token}
      />
    </Suspense>
  );
}

function SubmissionDataSkeleton() {
  const questions = Array.from({ length: 10 }, (_, index) => index + 1);

  return (
    <div className="w-full overflow-auto p-4">
      <div className="flex flex-col space-y-4 items-center max-w-4xl mx-auto">
        <Skeleton className="h-12 w-full" />
        {questions.map((question) => (
          <Skeleton className="h-16 w-full" key={question} />
        ))}
      </div>
    </div>
  );
}
