import { Form } from "@/types";
import FormDetails from "@/features/forms/ui/form-details";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { formAnalyticsFlag } from "@/lib/feature-flags";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { resolveFormFolderLink } from "@/features/forms/ui/resolve-form-folder-link";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";

type Params = {
  params: Promise<{ formId: string }>;
};

function formNotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Form not found"
      notFoundSubtitle="We couldn't find that form."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    >
      <Link href="/forms">
        <Button>Back to forms</Button>
      </Link>
    </NotFoundComponent>
  );
}

export default async function FormOverviewPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const enableAnalytics = await formAnalyticsFlag();
  const headerData = await getFormsHeaderDataCached(session?.accessToken);

  const api = new EndatixApi(session?.accessToken);
  const formResult = toResult(await api.forms.get(formId), {
    fallbackMessage: "Failed to load form.",
    logMessage: "Failed to load form overview.",
    loggerName: "forms.overview",
  });

  if (Result.isError(formResult)) {
    if (formResult.statusCode === 404) {
      return formNotFound();
    }

    return <HubPageLoadError result={formResult} />;
  }

  const form: Form = formResult.value;

  return (
    <FormDetails
      form={form}
      mode="page"
      showHeader={true}
      enableEditing={true}
      enableAnalytics={enableAnalytics}
      folderLink={resolveFormFolderLink(form, headerData.folders)}
    />
  );
}
