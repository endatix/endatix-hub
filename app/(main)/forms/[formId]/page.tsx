import { authorization } from "@/features/auth/authorization";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import { FormSummaryCards } from "@/features/forms/form-workspace/ui/form-summary-cards";
import { FormShareButton } from "@/features/forms/ui/form-share-button";
import { Result } from "@/lib/result";
import type { Form } from "@/types";

type Params = { params: Promise<{ formId: string }> };

/** A form's home: its facts at a glance. Its settings are edited on the Settings page. */
export default async function FormOverviewPage({ params }: Params) {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const { formId } = await params;
  const form = await loadWorkspaceForm(formId, "overview");
  if (Result.isError(form)) return <FormLoadError result={form} />;

  return <FormOverview form={form.value} />;
}

function FormOverview({ form }: Readonly<{ form: Form }>) {
  return (
    <div className="container py-6">
      <FormWorkspaceHeader
        title={form.name}
        description={form.description}
        actions={<FormShareButton formId={form.id} />}
      />
      <FormSummaryCards form={form} className="[--grid-card-min:260px]" />
    </div>
  );
}
