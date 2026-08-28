import { Form } from "@/types";
import { getForm } from "@/services/api";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { formAnalyticsFlag } from "@/lib/feature-flags";
import { redirect } from "next/navigation";
import PageTitle from "@/components/headings/page-title";
import { SurveyDashboardWrapper } from "@/features/form-analytics/ui/survey-dashboard-wrapper";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormAnalyticsPage({ params }: Readonly<Params>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const reportingEnabled = await formAnalyticsFlag();
  if (!reportingEnabled) {
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
        <Link href="/forms">
          <Button>Back to forms</Button>
        </Link>
      </NotFoundComponent>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle title={`Reporting: ${form.name}`} className="text-2xl" />
          <p className="mt-1 text-muted-foreground">
            Survey analytics and charts (v1: mocked data).
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/forms/${formId}`}>Back to form</Link>
        </Button>
      </div>
      {/* disabled for now until we add subission JSON data via the API */}
      <SurveyDashboardWrapper surveyJson={null} />
    </div>
  );
}
