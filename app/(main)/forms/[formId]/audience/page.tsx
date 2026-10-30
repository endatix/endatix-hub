import { Permissions } from "@/features/auth/authorization";
import { AudiencePageShell } from "@/features/audience/get-audience-page/ui/audience-page-shell";
import { audienceListSearch } from "@/features/audience/get-audience-page/audience-return-to";
import {
  loadAudiencePage,
  loadAudienceUsage,
  parseAudienceView,
  parsePeoplePaging,
  parsePeopleSearch,
  parsePeopleTestFilter,
} from "@/features/audience/get-audience-page";
import {
  requireAudienceAccess,
  type AudienceAccess,
} from "@/features/audience/shared/require-audience-api.server";
import { canCopyTestLink } from "@/features/audience/copy-test-link";
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
    q?: SearchParamValue;
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
    search: parsePeopleSearch(firstSearchParam(query.q)),
  };
}

type AudienceRequest = {
  api: EndatixApi;
  formId: string;
  query: Awaited<Params["searchParams"]>;
  canManageMatchKey: boolean;
  canEdit: boolean;
  canTest: boolean;
  canCopyTestLink: boolean;
};

function listSearchFrom(query: Awaited<Params["searchParams"]>): string {
  return audienceListSearch({
    page: firstSearchParam(query.page),
    pageSize: firstSearchParam(query.pageSize),
    view: firstSearchParam(query.view),
    test: firstSearchParam(query.test),
    q: firstSearchParam(query.q),
  });
}

type CheckPermission = AudienceAccess["checkPermission"];

/**
 * The form, and for an editor what its saved definition reads of the variables: the API's
 * variables read needs `forms.edit`, so a reader who may only view gets no coverage. The variables
 * load while the form does, and the saved definition alongside them once the form names it.
 */
async function formWithUsage(
  { api, formId, canEdit }: Pick<AudienceRequest, "api" | "formId" | "canEdit">,
  checkPermission: CheckPermission,
) {
  if (!canEdit) {
    return { form: await loadWorkspaceForm(formId, "audience"), usage: null };
  }
  const variables = loadAudienceVariables({ api, formId, checkPermission });
  const form = await loadWorkspaceForm(formId, "audience");
  if (Result.isError(form)) return { form, usage: null };
  const usage = await loadAudienceUsage({
    api,
    formId,
    activeDefinitionId: form.value.activeDefinitionId,
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
      header={<FormWorkspaceHeader title="Participants" />}
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
  const [manageSettings, editForms, testForms, copyTestLink] =
    await Promise.all([
      checkPermission(Permissions.Tenant.ManageSettings),
      checkPermission(Permissions.Forms.Edit),
      checkPermission(Permissions.Forms.Test),
      canCopyTestLink(checkPermission),
    ]);
  return {
    api,
    checkPermission,
    canManageMatchKey: manageSettings.success,
    canEdit: editForms.success,
    canTest: testForms.success,
    canCopyTestLink: copyTestLink,
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
