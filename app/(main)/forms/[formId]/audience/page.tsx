import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { FormAudienceNotFound } from "@/features/audience/get-audience-page/ui/form-audience-not-found";
import { AudiencePageShell } from "@/features/audience/get-audience-page/ui/audience-page-shell";
import {
  loadAudiencePage,
  loadFormForAudience,
  parseAudienceView,
  parsePeoplePaging,
} from "@/features/audience/get-audience-page";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { getFormWorkspaceFlags } from "@/features/forms/form-workspace/form-workspace-flags.server";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, type Error as ResultError } from "@/lib/result";
import { firstSearchParam, type SearchParam } from "@/lib/utils/next-utils";
import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    page?: SearchParam;
    pageSize?: SearchParam;
    view?: SearchParam;
  }>;
};

function failedLoad(result: ResultError) {
  return result.statusCode === 404 ? (
    <FormAudienceNotFound />
  ) : (
    <HubPageLoadError result={result} />
  );
}

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
};

async function audienceView({ query, ...request }: AudienceRequest) {
  const { api, formId } = request;
  const [form, audience] = await Promise.all([
    loadFormForAudience(api, formId),
    loadAudiencePage({ ...request, paging: pagingFrom(query) }),
  ]);
  if (Result.isError(form)) return failedLoad(form);
  if (Result.isError(audience)) return failedLoad(audience);

  return (
    <AudiencePageShell
      formId={formId}
      header={<FormWorkspaceHeader title="Audience" />}
      view={parseAudienceView(firstSearchParam(query.view))}
      data={audience.value}
    />
  );
}

/** The one guard for this page: Hub access, the flag, then the client the loaders use. */
async function guardAudiencePage(formId: string) {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();
  const flags = await getFormWorkspaceFlags();
  if (!flags.audience) return redirect(`/forms/${formId}`);
  const permission = await checkPermission(Permissions.Tenant.ManageSettings);
  return {
    api: new EndatixApi(session?.accessToken),
    canManageMatchKey: permission.success,
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
