import { NotFoundComponent } from "@/components/error-handling/not-found";
import { getUserFile } from "@/features/asset-storage/server";
import { SubmissionFileView } from "@/features/asset-storage/use-cases/get-user-file/ui";
import { Result } from "@/lib/result";
import Link from "next/link";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
    fileName: string;
  }>;
};

export default async function FilePage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId, submissionId, fileName } = await params;

  const fileResult = await getUserFile(
    formId,
    submissionId,
    decodeURIComponent(fileName),
  );

  if (Result.isError(fileResult)) {
    return (
      <NotFoundComponent
        notFoundTitle="File not found"
        notFoundSubtitle="The file could not be loaded."
        notFoundMessage={fileResult.message}
        titleSize="medium"
      >
        <Link
          href={`/forms/${formId}/submissions/${submissionId}/files`}
          className="text-primary hover:underline"
        >
          Back to files
        </Link>
      </NotFoundComponent>
    );
  }

  return (
    <SubmissionFileView
      file={fileResult.value}
      formId={formId}
      submissionId={submissionId}
      showBackLink
      aspectRatio="square"
    />
  );
}
