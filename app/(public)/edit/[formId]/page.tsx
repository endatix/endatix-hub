import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubmissionByTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-token.use-case";
import { Result } from "@/lib/result";
import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import EditSubmission from "@/features/submissions/ui/edit/edit-submission";
import {
  validateHexToken,
  validateEndatixId,
} from "@/lib/utils/type-validators";
import { getActiveFormDefinition } from "@/services/api";
import {
  createStorageConfigClient,
  generateReadTokensAction,
} from "@/features/storage/server";
import { StorageConfigProvider } from "@/features/storage/client";

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
        notFoundSubtitle="No edit token provided"
        notFoundMessage="You need a valid token to edit this submission."
        titleSize="medium"
      />
    );
  }

  const validateTokenResult = validateHexToken(token, "token");
  if (Result.isError(validateTokenResult)) {
    return (
      <NotFoundComponent
        notFoundTitle="Invalid Token"
        notFoundSubtitle="The provided token is invalid"
        notFoundMessage={validateTokenResult.message}
        titleSize="medium"
      />
    );
  }

  const submissionResult = await getSubmissionByTokenUseCase({
    formId: validateFormIdResult.value,
    token: validateTokenResult.value,
  });

  if (Result.isError(submissionResult)) {
    return (
      <NotFoundComponent
        notFoundTitle="Submission Not Found"
        notFoundSubtitle="Unable to load submission"
        notFoundMessage="The submission may have been deleted, the token may have expired, or you may not have permission to edit it."
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

  const storageConfig = createStorageConfigClient().config;
  const readTokenPromises = {
    userFiles: generateReadTokensAction(storageConfig.containerNames.USER_FILES),
    content: generateReadTokensAction(storageConfig.containerNames.CONTENT),
  };

  return (
    <Suspense fallback={<SubmissionDataSkeleton />}>
      <StorageConfigProvider
        config={storageConfig}
        readTokenPromises={readTokenPromises}
      >
        <EditSubmission
          submission={submission}
          formId={validateFormIdResult.value}
          token={validateTokenResult.value}
        />
      </StorageConfigProvider>
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
