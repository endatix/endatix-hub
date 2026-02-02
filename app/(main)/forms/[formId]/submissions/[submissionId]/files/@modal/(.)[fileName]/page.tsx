import { getUserFile } from "@/features/asset-storage/server";
import { SubmissionFileModal } from "@/features/asset-storage/use-cases/get-user-file/ui";
import { auth } from "@/auth";
import { authorization } from "@/features/auth";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
    fileName: string;
  }>;
};

export default async function FileModalPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId, submissionId, fileName } = await params;

  const fileResult = await getUserFile(
    formId,
    submissionId,
    decodeURIComponent(fileName),
  );

  return (
    <SubmissionFileModal
      fileResult={fileResult}
      formId={formId}
      submissionId={submissionId}
      aspectRatio="square"
    />
  );
}
