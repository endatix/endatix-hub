import { Form } from "@/types";
import { getForm } from "@/services/api";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { redirect } from "next/navigation";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { getFormWorkspaceFlags } from "@/features/forms/form-workspace/form-workspace-flags.server";
import { SurveyDashboardWrapper } from "@/features/form-analytics/ui/survey-dashboard-wrapper";
import { getSurveyLicenseKey } from "@/features/config/server";
import { SurveyLicenseProvider } from "@/features/config/survey-license-provider";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormAnalyticsPage({ params }: Readonly<Params>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const flags = await getFormWorkspaceFlags();
  if (!flags.analytics) {
    const { formId } = await params;
    redirect(`/forms/${formId}`);
  }

  const { formId } = await params;

  let form: Form | null = null;

  try {
    form = await getForm(formId);
  } catch (error) {
    console.error("Failed to load form for analytics:", error);
  }

  if (!form) {
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

  return (
    <div className="container py-6">
      <FormWorkspaceHeader
        title="Analytics"
        description="Survey analytics and charts (v1: mocked data)."
      />
      {/* disabled for now until we add subission JSON data via the API */}
      <SurveyLicenseProvider value={getSurveyLicenseKey()}>
        <SurveyDashboardWrapper surveyJson={null} />
      </SurveyLicenseProvider>
    </div>
  );
}
