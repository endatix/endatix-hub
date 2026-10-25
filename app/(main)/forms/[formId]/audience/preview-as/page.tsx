import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Permissions } from "@/features/auth/authorization";
import { loadPreviewAs, PreviewAsView } from "@/features/audience/preview-as";
import {
  PARTICIPANT_PAGE_PERMISSION,
  requireAudienceAccess,
} from "@/features/audience/shared/require-audience-api.server";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import { Result } from "@/lib/result";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/utils/next-utils";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ member?: SearchParamValue; q?: SearchParamValue }>;
};

export const metadata: Metadata = { title: "Preview as" };

/**
 * Like the participant page, Preview as reads participants' values, so it needs `forms.edit`
 * (the API's own gate) beside Hub access. With the personalization flag off it goes back to the
 * form.
 */
async function guardPreviewAs(formId: string) {
  const access = await requireAudienceAccess(PARTICIPANT_PAGE_PERMISSION);
  if (Result.isError(access)) return redirect(`/forms/${formId}`);
  const { api, checkPermission } = access.value;
  const testForms = await checkPermission(Permissions.Forms.Test);
  return { api, canTest: testForms.success };
}

const HEADER = (
  <FormWorkspaceHeader
    title="Preview as"
    description="The saved form as each participant gets it. Nothing you do here is saved."
  />
);

type Query = Awaited<Params["searchParams"]>;
type Guard = Awaited<ReturnType<typeof guardPreviewAs>>;

/** The lists do not need the form, so they start beside it; only the saved definition waits. */
async function previewAs(guard: Guard, formId: string, query: Query) {
  const formLoad = loadWorkspaceForm(formId, "audience.preview-as");
  const activeDefinitionId = formLoad.then((loaded) =>
    Result.isSuccess(loaded) ? loaded.value.activeDefinitionId : undefined,
  );
  const [form, preview] = await Promise.all([
    formLoad,
    loadPreviewAs({
      ...guard,
      formId,
      activeDefinitionId,
      memberId: firstSearchParam(query.member),
      search: firstSearchParam(query.q),
    }),
  ]);
  if (Result.isError(form)) return <FormLoadError result={form} />;
  if (Result.isError(preview)) return <FormLoadError result={preview} />;
  return <PreviewAsView formId={formId} header={HEADER} {...preview.value} />;
}

export default async function FormPreviewAsPage({
  params,
  searchParams,
}: Readonly<Params>) {
  const { formId } = await params;
  const guard = await guardPreviewAs(formId);
  return (
    <div className="container py-6">
      {await previewAs(guard, formId, await searchParams)}
    </div>
  );
}
