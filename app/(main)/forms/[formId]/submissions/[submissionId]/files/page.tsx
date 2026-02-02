import {
  listUserFiles,
  type UserFileMetadata,
} from "@/features/asset-storage/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";
import { authorization } from "@/features/auth";
import { auth } from "@/auth";
import { Result } from "@/lib/result";
import {
  SubmissionFilesError,
  SubmissionFilesTable,
  SubmissionFilesTableSkeleton,
} from "@/features/asset-storage/use-cases/list-user-files/ui";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
  }>;
};

interface SubmissionFilesContentProps {
  filesResultPromise: Promise<Result<UserFileMetadata[]>>;
  formId: string;
  submissionId: string;
}

async function SubmissionFilesContent({
  filesResultPromise,
  formId,
  submissionId,
}: Readonly<SubmissionFilesContentProps>) {
  const filesResult = await filesResultPromise;

  if (Result.isError(filesResult)) {
    return <SubmissionFilesError message={filesResult.message} />;
  }

  return (
    <SubmissionFilesTable
      files={filesResult.value}
      formId={formId}
      submissionId={submissionId}
    />
  );
}

export default async function FilesPage({ params }: Readonly<Params>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId, submissionId } = await params;
  const filesListPromise = listUserFiles(formId, submissionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/forms/${formId}/submissions/${submissionId}`}
            className="gap-2"
          >
            ← Back to submission
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission files</CardTitle>
          <CardDescription>
            Form {formId} · Submission {submissionId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<SubmissionFilesTableSkeleton />}>
            <SubmissionFilesContent
              filesResultPromise={filesListPromise}
              formId={formId}
              submissionId={submissionId}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
