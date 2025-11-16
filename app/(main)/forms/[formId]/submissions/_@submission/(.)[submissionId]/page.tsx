import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { getSubmission } from "@/services/api";

interface SubmissionPageProps {
  params: {
    formId: string;
    submissionId: string;
  };
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { submissionId, formId } = await params;
  const submission = await getSubmission(formId, submissionId);
  return (
    <div>
      <h1>{submissionId}</h1>
      <pre>{JSON.stringify(submission.id, null, 2)}</pre>
    </div>
  );
}
