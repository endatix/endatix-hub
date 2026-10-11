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
import { requireAudienceApi } from "@/features/audience/shared/require-audience-api.server";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import type { EndatixApi } from "@/lib/endatix-api";
import { Result, type Error as ResultError } from "@/lib/result";
import { firstSearchParam, type SearchParamValue } from "@/lib/utils/next-utils";
import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    page?: SearchParamValue;
    pageSize?: SearchParamValue;
    view?: SearchParamValue;
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

/** View gate shared with the actions, plus whether this reader may change the match key. */
async function guardAudiencePage(formId: string) {
  const api = await requireAudienceApi(Permissions.Forms.View);
  if (Result.isError(api)) return redirect(`/forms/${formId}`);
  const session = await auth();
  const { checkPermission } = await authorization(session);
  const manageSettings = await checkPermission(
    Permissions.Tenant.ManageSettings,
  );
  return { api: api.value, canManageMatchKey: manageSettings.success };
}

export default async function FormAudiencePage({
  params,
  searchParams,
}: Readonly<Params>) {
  const { formId } = await params;
  const guard = await guardAudiencePage(formId);
  return audienceView({ ...guard, formId, query: await searchParams });
}
