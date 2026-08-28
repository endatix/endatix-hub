import { Form } from "@/types";
import { getForm } from "@/services/api";
import FormDetails from "@/features/forms/ui/form-details";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { formAnalyticsFlag } from "@/lib/feature-flags";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { resolveFormFolderLink } from "@/features/forms/ui/resolve-form-folder-link";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormOverviewPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const enableAnalytics = await formAnalyticsFlag();
  const headerData = await getFormsHeaderDataCached(session?.accessToken);

  let form: Form | null = null;

  try {
    form = await getForm(formId);
  } catch (error) {
    console.error("Failed to load form:", error);
  }

  if (!form) {
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
