import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Permissions } from "@/features/auth/authorization";
import {
  loadParticipantPage,
  ParticipantGone,
  ParticipantPage,
} from "@/features/audience/get-participant-page";
import { requireAudienceAccess } from "@/features/audience/shared/require-audience-api.server";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import { Result } from "@/lib/result";

type Params = { params: Promise<{ formId: string; memberId: string }> };

export const metadata: Metadata = { title: "Participant" };

/**
 * Reading a participant needs `forms.edit` (the API's own gate); a reader without it is
 * redirected. With the personalization flag off the page goes back to the form.
 */
async function guardParticipantPage(formId: string) {
  const access = await requireAudienceAccess(Permissions.Forms.Edit);
  if (Result.isError(access)) return redirect(`/forms/${formId}`);
  const { api, checkPermission } = access.value;
  const testForms = await checkPermission(Permissions.Forms.Test);
  return { api, canTest: testForms.success };
}

export default async function FormParticipantPage({
  params,
}: Readonly<Params>) {
  const { formId, memberId } = await params;
  const guard = await guardParticipantPage(formId);
  const [form, page] = await Promise.all([
    loadWorkspaceForm(formId, "audience.participant"),
    loadParticipantPage({ ...guard, formId, memberId }),
  ]);
  if (Result.isError(form)) return <FormLoadError result={form} />;
  if (Result.isError(page)) return <FormLoadError result={page} />;
  if (page.value.status === "gone") return <ParticipantGone formId={formId} />;
  return <ParticipantPage formId={formId} {...page.value.data} />;
}
