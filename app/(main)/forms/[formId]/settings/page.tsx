import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import FormDetails from "@/features/forms/ui/form-details";
import { resolveFormFolderLink } from "@/features/forms/ui/resolve-form-folder-link";
import { Result } from "@/lib/result";
import type { Form } from "@/types";

type Params = { params: Promise<{ formId: string }> };

/**
 * Everything about a form that is not its design: going live, respondent rules, folder,
 * metadata and webhooks. Kept as one page until the settings revamp splits it by concern.
 */
export default async function FormSettingsPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const [form, headerData] = await Promise.all([
    loadWorkspaceForm(formId, "settings"),
    getFormsHeaderDataCached(session?.accessToken),
  ]);
  if (Result.isError(form)) return <FormLoadError result={form} />;

  const folders = headerData.folders ?? [];
  return <FormSettings form={form.value} folders={folders} />;
}

type FormSettingsProps = {
  form: Form;
  folders: Parameters<typeof resolveFormFolderLink>[1];
};

function FormSettings({ form, folders }: Readonly<FormSettingsProps>) {
  return (
    <div className="container py-6">
      <FormDetails
        form={form}
        mode="page"
        showHeader
        pageTitle="Settings"
        titleSize="text-2xl"
        enableEditing
        folderLink={resolveFormFolderLink(form, folders)}
      />
    </div>
  );
}
