import { Permissions } from "@/features/auth/authorization";
import { AudiencePageShell } from "@/features/audience/get-audience-page/ui/audience-page-shell";
import {
  loadAudiencePage,
  parseAudienceView,
  parsePeoplePaging,
} from "@/features/audience/get-audience-page";
import { requireAudienceAccess } from "@/features/audience/shared/require-audience-api.server";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { loadWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { FormLoadError } from "@/features/forms/form-workspace/ui/form-load-error";
import type { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/utils/next-utils";
import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    page?: SearchParamValue;
    pageSize?: SearchParamValue;
    view?: SearchParamValue;
  }>;
};

function pagingFrom(query: Awaited<Params["searchParams"]>) {
  return parsePeoplePaging({
    page: firstSearchParam(query.page),
    pageSize: firstSearchParam(query.pageSize),
  });
}

type AudienceRequest = {
  api: EndatixApi;
  formId: string;
  query: Awaited<Params["searchParams"]>;
  canManageMatchKey: boolean;
  canEdit: boolean;
};

async function audienceView({ query, ...request }: AudienceRequest) {
  const { formId } = request;
  const [form, audience] = await Promise.all([
    loadWorkspaceForm(formId, "audience"),
    loadAudiencePage({ ...request, paging: pagingFrom(query) }),
  ]);
  if (Result.isError(form)) return <FormLoadError result={form} />;
  if (Result.isError(audience)) return <FormLoadError result={audience} />;

  return (
    <AudiencePageShell
      formId={formId}
      header={<FormWorkspaceHeader title="Audience" />}
      view={parseAudienceView(firstSearchParam(query.view))}
      data={audience.value}
    />
  );
}

/**
 * View gate shared with the actions, plus which writes this reader may make, so the page
 * hides the controls an action would refuse instead of letting the action redirect.
 */
async function guardAudiencePage(formId: string) {
  const access = await requireAudienceAccess(Permissions.Forms.View);
  if (Result.isError(access)) return redirect(`/forms/${formId}`);
  const { api, checkPermission } = access.value;
  const [manageSettings, editForms] = await Promise.all([
    checkPermission(Permissions.Tenant.ManageSettings),
    checkPermission(Permissions.Forms.Edit),
  ]);
  return {
    api,
    canManageMatchKey: manageSettings.success,
    canEdit: editForms.success,
  };
}

export default async function FormAudiencePage({
  params,
  searchParams,
}: Readonly<Params>) {
  const { formId } = await params;
  const guard = await guardAudiencePage(formId);
  return audienceView({ ...guard, formId, query: await searchParams });
}
