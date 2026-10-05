import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { FormAudienceNotFound } from "@/features/audience/get-audience-page/ui/form-audience-not-found";
import { AudiencePageShell } from "@/features/audience/get-audience-page/ui/audience-page-shell";
import {
  loadAudiencePage,
  loadFormForAudience,
  parsePeoplePage,
} from "@/features/audience/get-audience-page";
import { personalizationFlag } from "@/lib/feature-flags";
import { Result, type Error as ResultError } from "@/lib/result";
import { firstSearchParam, type SearchParam } from "@/lib/utils/next-utils";
import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ page?: SearchParam }>;
};

function failedLoad(result: ResultError) {
  return result.statusCode === 404 ? (
    <FormAudienceNotFound />
  ) : (
    <HubPageLoadError result={result} />
  );
}

export default async function FormAudiencePage({
  params,
  searchParams,
}: Readonly<Params>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  if (!(await personalizationFlag())) redirect(`/forms/${formId}`);

  const form = await loadFormForAudience(formId);
  if (Result.isError(form)) return failedLoad(form);

  const page = parsePeoplePage(firstSearchParam((await searchParams).page));
  const audience = await loadAudiencePage(formId, page);
  if (Result.isError(audience)) return failedLoad(audience);

  return (
    <AudiencePageShell
      formId={formId}
      formName={form.value.name}
      data={audience.value}
    />
  );
}
