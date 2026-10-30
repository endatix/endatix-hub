import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Permissions } from "@/features/auth/authorization";
import {
  loadParticipantPage,
  ParticipantGone,
  ParticipantPage,
} from "@/features/audience/get-participant-page";
import {
  PARTICIPANT_PAGE_PERMISSION,
  requireAudienceAccess,
} from "@/features/audience/shared/require-audience-api.server";
import { testLinkAccess } from "@/features/audience/copy-test-link";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import { Result } from "@/lib/result";

type Params = { params: Promise<{ formId: string; memberId: string }> };

export const metadata: Metadata = { title: "Participant" };

/**
 * Reading a participant needs Hub access and `forms.edit` (the API's own gate).
 * `requireAudienceAccess` requires both and redirects when either is missing. With the
 * personalization flag off the page goes back to the form.
 */
async function guardParticipantPage(formId: string) {
  const access = await requireAudienceAccess(PARTICIPANT_PAGE_PERMISSION);
  if (Result.isError(access)) return redirect(`/forms/${formId}`);
  const { api, checkPermission } = access.value;
  const [testForms, testLinks] = await Promise.all([
    checkPermission(Permissions.Forms.Test),
    testLinkAccess(api, formId, checkPermission),
  ]);
  return {
    api,
    canTest: testForms.success,
    canCopyTestLink: testLinks.canCopyTestLink,
  };
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
