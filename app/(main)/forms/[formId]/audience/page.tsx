import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { personalizationFlag } from "@/lib/feature-flags";
import { redirect } from "next/navigation";
import { FormAudienceNotFound } from "@/features/audience/ui/form-audience-not-found";
import { AudiencePageShell } from "@/features/audience/ui/audience-page-shell";
import { loadAudienceView } from "@/features/audience/load-audience-view";

type Params = { params: Promise<{ formId: string }> };

export default async function FormAudiencePage({ params }: Readonly<Params>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  if (!(await personalizationFlag())) redirect(`/forms/${formId}`);

  const view = await loadAudienceView(formId);
  if (view.kind === "not-found") return <FormAudienceNotFound />;
  if (view.kind === "error") return view.node;

  return (
    <AudiencePageShell
      formId={formId}
      formName={view.form.name}
      data={view.data}
    />
  );
}
