import PageTitle from "@/components/headings/page-title";
import { CreateFormWizard } from "@/features/forms/use-cases/create-form";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { EndatixApi } from "@/lib/endatix-api";
import Link from "next/link";

export default async function CreateFormPage() {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const [settingsResult, foldersResult] = await Promise.all([
    api.tenant.getSettings(),
    api.folders.list(),
  ]);

  const requireFolderAssignment =
    settingsResult.success &&
    (settingsResult.data.requireFolderAssignment ?? false);
  const folders: Folder[] = foldersResult.success
    ? foldersResult.data
    : [];

  return (
    <>
      <PageTitle title="Create Form" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          <Link href="/forms" className="text-primary hover:underline">
            ← Back to forms
          </Link>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Create a new form</h2>
          <p className="text-muted-foreground mb-6">
            Design your form with a simple drag and drop interface.
          </p>

          <CreateFormWizard
            requireFolderAssignment={requireFolderAssignment}
            folders={folders}
          />
        </div>
      </div>
    </>
  );
}
