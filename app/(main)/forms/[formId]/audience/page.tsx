import { Permissions } from "@/features/auth/authorization";
import { AudiencePageShell } from "@/features/audience/get-audience-page/ui/audience-page-shell";
import { audienceListSearch } from "@/features/audience/get-audience-page/audience-return-to";
import {
  loadAudiencePage,
  loadAudienceUsage,
  parseAudienceView,
  parsePeoplePaging,
  parsePeopleTestFilter,
} from "@/features/audience/get-audience-page";
import {
  requireAudienceAccess,
  type AudienceAccess,
} from "@/features/audience/shared/require-audience-api.server";
import { loadAudienceVariables } from "@/features/audience/server";
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
    test?: SearchParamValue;
  }>;
};

function peopleQueryFrom(query: Awaited<Params["searchParams"]>) {
  const paging = parsePeoplePaging({
    page: firstSearchParam(query.page),
    pageSize: firstSearchParam(query.pageSize),
  });
  return {
    ...paging,
    test: parsePeopleTestFilter(firstSearchParam(query.test)),
  };
}

type AudienceRequest = {
  api: EndatixApi;
  formId: string;
  query: Awaited<Params["searchParams"]>;
  canManageMatchKey: boolean;
  canEdit: boolean;
  canTest: boolean;
};

function listSearchFrom(query: Awaited<Params["searchParams"]>): string {
  return audienceListSearch({
    page: firstSearchParam(query.page),
    pageSize: firstSearchParam(query.pageSize),
    view: firstSearchParam(query.view),
    test: firstSearchParam(query.test),
  });
}

type CheckPermission = AudienceAccess["checkPermission"];

/** The form and its variables together, then what its saved definition reads of them. */
async function formWithUsage(
  { api, formId }: Pick<AudienceRequest, "api" | "formId">,
  checkPermission: CheckPermission,
) {
  const [form, variables] = await Promise.all([
    loadWorkspaceForm(formId, "audience"),
    loadAudienceVariables({ api, formId, checkPermission }),
  ]);
  if (Result.isError(form)) return { form, usage: null };
  const { activeDefinitionId } = form.value;
  const usage = await loadAudienceUsage({
    api,
    formId,
    activeDefinitionId,
    variables,
  });
  return { form, usage };
}

/** The active view and the list query Back restores. */
function viewFrom(query: Awaited<Params["searchParams"]>) {
  return {
    view: parseAudienceView(firstSearchParam(query.view)),
    listSearch: listSearchFrom(query),
  };
}

async function audienceView(
  { query, ...request }: AudienceRequest,
  checkPermission: CheckPermission,
) {
  const [{ form, usage }, audience] = await Promise.all([
    formWithUsage(request, checkPermission),
    loadAudiencePage({ ...request, paging: peopleQueryFrom(query) }),
  ]);
  if (Result.isError(form)) return <FormLoadError result={form} />;
  if (Result.isError(audience)) return <FormLoadError result={audience} />;
  return (
    <AudiencePageShell
      formId={request.formId}
      header={<FormWorkspaceHeader title="Audience" />}
      {...viewFrom(query)}
      data={audience.value}
      usage={usage}
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
  const [manageSettings, editForms, testForms] = await Promise.all([
    checkPermission(Permissions.Tenant.ManageSettings),
    checkPermission(Permissions.Forms.Edit),
    checkPermission(Permissions.Forms.Test),
  ]);
  return {
    api,
    checkPermission,
    canManageMatchKey: manageSettings.success,
    canEdit: editForms.success,
    canTest: testForms.success,
  };
}

export default async function FormAudiencePage({
  params,
  searchParams,
}: Readonly<Params>) {
  const { formId } = await params;
  const { checkPermission, ...guard } = await guardAudiencePage(formId);
  const query = await searchParams;
  return audienceView({ ...guard, formId, query }, checkPermission);
}
