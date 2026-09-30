import FormDetails from "@/features/forms/ui/form-details";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { formAnalyticsFlag, personalizationFlag } from "@/lib/feature-flags";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { resolveFormFolderLink } from "@/features/forms/ui/resolve-form-folder-link";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import type { Form } from "@/types";
import type { ReactNode } from "react";

type Params = { params: Promise<{ formId: string }> };
type Flags = Awaited<ReturnType<typeof loadFlagsAndHeader>>;
type FormResult = Awaited<ReturnType<typeof loadForm>>;

function formNotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Form not found"
      notFoundSubtitle="We couldn't find that form."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    >
      <Button asChild>
        <Link href="/forms">Back to forms</Link>
      </Button>
    </NotFoundComponent>
  );
}

async function loadFlagsAndHeader(accessToken?: string) {
  const [enableAnalytics, enableAudience, headerData] = await Promise.all([
    formAnalyticsFlag(),
    personalizationFlag(),
    getFormsHeaderDataCached(accessToken),
  ]);
  return { enableAnalytics, enableAudience, headerData };
}

async function loadForm(formId: string, accessToken?: string) {
  return toResult(await new EndatixApi(accessToken).forms.get(formId), {
    fallbackMessage: "Failed to load form.",
    logMessage: "Failed to load form overview.",
    loggerName: "forms.overview",
  });
}

function renderFormDetails(form: Form, flags: Flags) {
  return (
    <FormDetails
      form={form}
      mode="page"
      showHeader
      enableEditing
      enableAnalytics={flags.enableAnalytics}
      enableAudience={flags.enableAudience}
      folderLink={resolveFormFolderLink(form, flags.headerData.folders ?? [])}
    />
  );
}

function renderFormOrError(formResult: FormResult, flags: Flags): ReactNode {
  if (Result.isError(formResult)) {
    return formResult.statusCode === 404
      ? formNotFound()
      : <HubPageLoadError result={formResult} />;
  }
  return renderFormDetails(formResult.value, flags);
}

export default async function FormOverviewPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const [flags, formResult] = await Promise.all([
    loadFlagsAndHeader(session?.accessToken),
    loadForm(formId, session?.accessToken),
  ]);
  return renderFormOrError(formResult, flags);
}
