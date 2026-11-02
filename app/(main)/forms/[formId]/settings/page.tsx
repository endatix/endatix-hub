import { authorization } from "@/features/auth/authorization";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import FormDetails from "@/features/forms/ui/form-details";
import { FilterableQuestionsSection } from "@/features/submissions/choose-filterable-questions";
import { Result } from "@/lib/result";
import type { Form } from "@/types";
import { Suspense } from "react";

type Params = { params: Promise<{ formId: string }> };

/**
 * Everything about a form that is not its design: going live, respondent rules, folder,
 * metadata, webhooks and the questions the submissions grid can filter. Kept as one page
 * until the settings revamp splits it by concern.
 */
export default async function FormSettingsPage({ params }: Readonly<Params>) {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const { formId } = await params;
  const form = await loadWorkspaceForm(formId, "settings");
  if (Result.isError(form)) return <FormLoadError result={form} />;

  return <FormSettings form={form.value} />;
}

function FormSettings({ form }: Readonly<{ form: Form }>) {
  return (
    <div className="container py-6">
      <FormWorkspaceHeader title="Settings" />
      <FormDetails form={form} enableEditing />
      <Suspense fallback={null}>
        <FilterableQuestionsSection formId={form.id} />
      </Suspense>
    </div>
  );
}
